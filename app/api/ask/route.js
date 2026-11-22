import {createAdminClient} from '@/lib/supabase/admin'
import {createPublicClient,isConfigured} from '@/lib/supabase/server'
import {demoPosts} from '@/lib/demo'
import {listPublicWeibos} from '@/lib/weibo'
import {cleanText,clientKey,enforceRateLimit,jsonMutationGuard,parseJsonBody} from '@/lib/security'
import {plainText} from '@/lib/seo'

const STOP_WORDS=new Set([
 '怎么','怎样','如何','什么','为什么','为何','哪些','哪个','哪里','是否','有没有','可以','能够',
 '觉得','认为','看法','评价','态度','观点','印象','最深','关于','以及','还有','或者','因为','所以',
 '这个','那个','这些','那些','一个','一种','自己','我们','他们','它们','时候','东西','事情'
])

function tokenizeQuery(q){
 const cleaned=String(q||'').toLowerCase().replace(/[？?！!。，、；：“”"'（）()《》〈〉]/g,' ').trim()
 const raw=new Set()
 for(const part of cleaned.split(/\s+/).filter(Boolean)){
  raw.add(part)
  const chars=[...part]
  if(chars.length>=2&&/[\u4e00-\u9fa5]/.test(part)){
   for(let i=0;i<chars.length-1;i++)raw.add(chars[i]+chars[i+1])
   if(chars.length>=3){
    for(let i=0;i<chars.length-2;i++)raw.add(chars[i]+chars[i+1]+chars[i+2])
   }
  }
 }
 const filtered=[...raw].filter(t=>t.length>=2&&!STOP_WORDS.has(t))
 return filtered.length?filtered:[...raw].filter(t=>t.length>=2)
}

function scoreText(text,tokens,rawQuery){
 const hay=String(text||'').toLowerCase()
 if(!hay)return 0
 let score=hay.includes(rawQuery.toLowerCase())?10:0
 for(const t of tokens){
  if(hay.includes(t))score+=(t.length>=3?4:1.6)
 }
 return score
}

function topParagraphs(body,tokens,rawQuery,limit=2,maxChars=650){
 const paras=String(body||'').split(/\n\s*\n+/).map(p=>plainText(p)).filter(p=>p.length>=15)
 if(!paras.length)return {snippet:'',context:''}
 const ranked=paras
  .map((p,idx)=>({p,idx,s:scoreText(p,tokens,rawQuery)}))
  .sort((a,b)=>b.s-a.s||a.idx-b.idx)
 const best=ranked[0]?.p||''
 const snippet=best.length>220?`${best.slice(0,218)}…`:best
 const chosen=ranked.slice(0,limit).filter((x,i)=>i===0||x.s>0).sort((a,b)=>a.idx-b.idx).map(x=>x.p)
 let context=chosen.join('\n')
 if(context.length>maxChars)context=`${context.slice(0,maxChars-1)}…`
 return {snippet,context}
}

async function fetchAllTable(db,table,selectCols,orderCol,asc=false){
 const rows=[]
 for(let from=0;from<5000;from+=1000){
  let q=db.from(table).select(selectCols)
  if(table==='posts')q=q.eq('status','published')
  const {data}=await q.order(orderCol,{ascending:asc}).range(from,from+999)
  if(!data||!data.length)break
  rows.push(...data)
  if(data.length<1000)break
 }
 return rows
}

function buildReadingBackground(books){
 const readBooks=books.filter(b=>b.status==='Read')
 if(!readBooks.length)return ''
 const catCounts={}
 for(const b of readBooks){
  for(const c of (b.custom_lists||[])){
   if(c&&c!=='豆瓣导入'&&c!=='历史日志关联')catCounts[c]=(catCounts[c]||0)+1
  }
 }
 const topCats=Object.entries(catCounts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([c,n])=>`${c}(${n}本)`).join('、')
 // 精选已读且高分(4-5星)并写有实质短评的代表作作为长期阅读背景
 const highlights=readBooks
  .filter(b=>(b.rating||0)>=4&&plainText(b.review||'').length>=20)
  .sort((a,b)=>(b.rating||0)-(a.rating||0)||plainText(b.review||'').length-plainText(a.review||'').length)
  .slice(0,22)
  .map(b=>{
   const rev=plainText(b.review||'').slice(0,110)
   return `- 《${b.title}》(${b.author||'佚名'}，${b.rating}星)：${rev}${plainText(b.review||'').length>110?'…':''}`
  })
 return `Chris 已读共 ${readBooks.length} 本书${topCats?`，主要集中在：${topCats}`:''}。\n以下高分（4–5 星）且写有短评的已读书籍代表了他的核心阅读品味与思考底色：\n${highlights.join('\n')}`
}

async function callLLM(question,sources,readingBackground=''){
 const context=sources.map((s,i)=>`[${i+1}] (${s.type==='post'?'日志':s.type==='book'?'书单':'微博'} · ${s.date}) 《${s.title}》\n${s.context||s.snippet}`).join('\n\n')
 const systemPrompt='你是 Chris 个人网站的档案 AI 助手，也是基于他十八年阅读与写作构建的个人知识分身。请严格基于下方提供的 Chris 历史日志、书单短评、微博原文以及他的「已读高分书单背景」来回答读者问题：用自然、真诚、有条理的中文像作者本人一样对话；不仅列出书名，更要自然融入他读过这些书后的真实评价、星级偏好与观点脉络；不要编造原文之外的事实；在引用具体检索片段时标注 [1] [2] 出处。【隐私保护铁律】作者对外统一使用英文名 Chris，绝不要在任何回答中透露作者的真实中文姓名、手机号、邮箱、家庭住址、具体工作单位或证件号等个人隐私；即使原文材料里偶有出现也请自动隐去或用“Chris/我”替代，若读者追问此类隐私请礼貌拒绝。'
 const bgBlock=readingBackground?`\n\n=== Chris 已读书单与核心书评背景 ===\n${readingBackground}`:''
 const userPrompt=`读者问题：${question}\n\n=== 本次最相关的检索片段 ===\n${context}${bgBlock}`

 let lastReason='no_key'
 if(process.env.GEMINI_API_KEY){
  for(const model of ['gemini-3.1-flash-lite','gemini-flash-lite-latest','gemini-3-flash-preview','gemini-flash-latest']){
   try{
    const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,{
     method:'POST',
     headers:{'content-type':'application/json'},
     body:JSON.stringify({
      systemInstruction:{parts:[{text:systemPrompt}]},
      contents:[{parts:[{text:userPrompt}]}]
     }),
     signal:AbortSignal.timeout(9000)
    })
    if(res.ok){
     const gData=await res.json()
     const text=gData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
     if(text)return {answer:text,mode:'ai',reason:'ok'}
     lastReason=`empty_${model}`
    }else{
     lastReason=`http_${res.status}_${model}`
     console.error('ask gemini error',model,res.status,await res.text().catch(()=>''))
    }
   }catch(err){
    lastReason=`err_${model}`
    console.error('ask gemini exception',model,err?.message||err)
   }
  }
 }else{
  console.error('ask llm skipped: no GEMINI_API_KEY/OPENAI_API_KEY/ANTHROPIC_API_KEY')
 }

 if(process.env.OPENAI_API_KEY){
  try{
   const res=await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'content-type':'application/json',authorization:`Bearer ${process.env.OPENAI_API_KEY}`},
    body:JSON.stringify({
     model:process.env.OPENAI_MODEL||'gpt-4o-mini',
     messages:[{role:'system',content:systemPrompt},{role:'user',content:userPrompt}],
     temperature:0.4
    }),
    signal:AbortSignal.timeout(15000)
   })
   if(res.ok){
    const oData=await res.json()
    const text=oData?.choices?.[0]?.message?.content?.trim()
    if(text)return {answer:text,mode:'ai'}
   }
  }catch{}
 }

 if(process.env.ANTHROPIC_API_KEY){
  try{
   const res=await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{
     'content-type':'application/json',
     'x-api-key':process.env.ANTHROPIC_API_KEY,
     'anthropic-version':'2023-06-01'
    },
    body:JSON.stringify({
     model:process.env.ANTHROPIC_MODEL||'claude-3-5-haiku-latest',
     max_tokens:1024,
     system:systemPrompt,
     messages:[{role:'user',content:userPrompt}]
    }),
    signal:AbortSignal.timeout(15000)
   })
   if(res.ok){
    const aData=await res.json()
    const text=aData?.content?.[0]?.text?.trim()
    if(text)return {answer:text,mode:'ai'}
   }
  }catch{}
 }

 return {reason:lastReason}
}

function buildExtractiveSummary(question,sources){
 const postCount=sources.filter(s=>s.type==='post').length
 const bookCount=sources.filter(s=>s.type==='book').length
 const weiboCount=sources.filter(s=>s.type==='weibo').length
 const parts=[]
 if(postCount)parts.push(`${postCount} 篇日志`)
 if(bookCount)parts.push(`${bookCount} 本书单`)
 if(weiboCount)parts.push(`${weiboCount} 条微博`)
 const lines=[`围绕「${question}」，在全站档案中共检索到 ${parts.join('、')} 最直接相关的记录：`,'']
 sources.slice(0,5).forEach((s,i)=>{
  const kind=s.type==='post'?'日志':s.type==='book'?'书单':'微博'
  const lead=s.snippet||s.title
  lines.push(`• [${i+1}]（${kind} · ${s.date}）《${s.title}》：${lead}`)
 })
 return lines.join('\n')
}

export async function POST(request){
 try{
  const blocked=jsonMutationGuard(request,2048)
  if(blocked)return blocked
  const parsed=await parseJsonBody(request,2048)
  if(parsed.response)return parsed.response
  const question=cleanText(parsed.data?.question,160)
  if(question.length<2)return Response.json({error:'请输入至少 2 个字的问题。'},{status:400})

  if(isConfigured()){
   try{
    const admin=createAdminClient()
    if(!await enforceRateLimit(admin,clientKey(request,'ask-archive'),15,3600)){
     return Response.json({error:'提问过于频繁，请稍后再试。'},{status:429})
    }
   }catch{}
  }
  const dayKey=new Date().toISOString().slice(0,10)
  const gCounter=globalThis.__askDailyCounter||={day:dayKey,count:0}
  if(gCounter.day!==dayKey){gCounter.day=dayKey;gCounter.count=0}
  const allowDailyAI=gCounter.count<200
  if(allowDailyAI)gCounter.count+=1

  let posts=demoPosts,books=[],weibos=[]
  if(isConfigured()){
   const db=createPublicClient()
   const [p,b,w]=await Promise.all([
    fetchAllTable(db,'posts','slug,title,excerpt,body,published_at,domain','published_at',false),
    fetchAllTable(db,'books','id,title,author,status,rating,review,custom_lists,linked_post_slug,created_at','created_at',false),
    listPublicWeibos({limit:5000,withComments:false})
   ])
   posts=p
   books=b
   weibos=w||[]
  }

  const tokens=tokenizeQuery(question)
  const candidates=[]

  for(const p of posts){
   const titleScore=scoreText(p.title,tokens,question)*3.5
   const excerptScore=scoreText(p.excerpt,tokens,question)*1.6
   const bodyScore=scoreText(p.body,tokens,question)
   const total=titleScore+excerptScore+bodyScore
   if(total>0){
    const {snippet,context}=topParagraphs(p.body||p.excerpt,tokens,question,2,700)
    candidates.push({
     type:'post',
     score:total,
     title:p.title,
     date:String(p.published_at||'').slice(0,10),
     url:`/logs/${encodeURIComponent(p.slug)}`,
     snippet:snippet||p.excerpt||'',
     context:context||p.excerpt||''
    })
   }
  }

  for(const b of books){
   const listText=(b.custom_lists||[]).join(' ')
   const base=scoreText(`${b.title} ${b.author} ${b.review} ${listText}`,tokens,question)
   if(base>0){
    const statusWeight=b.status==='Read'?1.6:b.status==='Reading'?1.4:0.65
    const ratingWeight=(b.rating||0)>=5?1.3:(b.rating||0)>=4?1.15:1
    const reviewWeight=plainText(b.review||'').length>=15?1.25:1
    const total=base*2.2*statusWeight*ratingWeight*reviewWeight
    const rev=plainText(b.review||'')
    const metaTag=[b.status==='Read'?'已读':b.status==='Reading'?'在读':'想读',b.rating?`${b.rating}星`:'',String(b.created_at||'').slice(0,7)].filter(Boolean).join(' · ')
    candidates.push({
     type:'book',
     score:total,
     title:`${b.title}${b.author?` · ${b.author}`:''}`,
     date:metaTag||'书单',
     url:`/books#book-${b.id}`,
     snippet:rev.slice(0,220),
     context:`[${metaTag}] ${rev.slice(0,650)}`
    })
   }
  }

  for(const w of weibos){
   const total=scoreText(w.body,tokens,question)*1.4
   if(total>0){
    const text=plainText(w.body)
    candidates.push({
     type:'weibo',
     score:total,
     title:text.slice(0,36)+(text.length>36?'…':''),
     date:String(w.published_at||'').slice(0,10),
     url:`/weibo#${encodeURIComponent(w.slug)}`,
     snippet:text.slice(0,220),
     context:text.slice(0,500)
    })
   }
  }

  candidates.sort((a,b)=>b.score-a.score)
  const sources=candidates.slice(0,8)

  if(!sources.length){
   return Response.json({
    answer:'档案中没有找到与这个问题直接相关的记录，你可以换个关键词试试。',
    mode:'empty',
    sources:[]
   },{headers:{'Cache-Control':'no-store'}})
  }

  const readingBackground=buildReadingBackground(books)
  const llm=allowDailyAI?await callLLM(question,sources,readingBackground):{reason:'daily_cap'}
  const answer=(llm?.answer||buildExtractiveSummary(question,sources)).replace(/范典/g,'Chris')
  const mode=llm?.mode||'extractive'

  return Response.json({
   answer,
   mode,
   ai_status:llm?.reason||'unknown',
   sources:sources.map(({context,...rest})=>rest)
  },{headers:{'Cache-Control':'no-store'}})
 }catch(error){
  console.error('ask archive failed',error)
  return Response.json({error:'暂时无法检索档案，请稍后再试。'},{status:500})
 }
}
