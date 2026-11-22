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

async function callLLM(question,sources){
 const context=sources.map((s,i)=>`[${i+1}] (${s.type==='post'?'日志':s.type==='book'?'书单':'微博'} · ${s.date}) 《${s.title}》\n${s.context||s.snippet}`).join('\n\n')
 const systemPrompt='你是 Chris（范典）个人网站的档案 AI 助手。请严格基于下方提供的 Chris 历史日志、书单短评和微博原文，用自然、有条理、像真人对话一样的中文回答读者问题。不要编造原文之外的事实；在合适的位置用 [1] [2] 标注出处；如果材料有时间跨度，可以点出观点或经历随时间的演变。'
 const userPrompt=`读者问题：${question}\n\n检索到的原文材料：\n${context}`

 if(process.env.GEMINI_API_KEY){
  for(const model of ['gemini-2.5-flash','gemini-2.0-flash']){
   try{
    const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,{
     method:'POST',
     headers:{'content-type':'application/json'},
     body:JSON.stringify({
      systemInstruction:{parts:[{text:systemPrompt}]},
      contents:[{parts:[{text:userPrompt}]}]
     }),
     signal:AbortSignal.timeout(15000)
    })
    if(res.ok){
     const gData=await res.json()
     const text=gData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
     if(text)return {answer:text,mode:'ai'}
    }
   }catch{}
  }
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

 return null
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

  let allowDailyAI=true
  if(isConfigured()){
   try{
    const admin=createAdminClient()
    if(!await enforceRateLimit(admin,clientKey(request,'ask-archive'),15,3600)){
     return Response.json({error:'提问过于频繁，请稍后再试。'},{status:429})
    }
    // 全站每日 AI 调用硬上限（200 次/天），防止被刷爆后仍可降级为本地摘要
    allowDailyAI=await enforceRateLimit(admin,'ask-archive:daily-global',200,86400)
   }catch{}
  }

  let posts=demoPosts,books=[],weibos=[]
  if(isConfigured()){
   const db=createPublicClient()
   const [p,b,w]=await Promise.all([
    fetchAllTable(db,'posts','slug,title,excerpt,body,published_at,domain','published_at',false),
    fetchAllTable(db,'books','id,title,author,review,linked_post_slug,created_at','created_at',false),
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
   const total=scoreText(`${b.title} ${b.author} ${b.review}`,tokens,question)*2.2
   if(total>0){
    const rev=plainText(b.review||'')
    candidates.push({
     type:'book',
     score:total,
     title:`${b.title}${b.author?` · ${b.author}`:''}`,
     date:String(b.created_at||'').slice(0,7)||'书单',
     url:`/books#book-${b.id}`,
     snippet:rev.slice(0,220),
     context:rev.slice(0,500)
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

  const llm=allowDailyAI?await callLLM(question,sources):null
  const answer=llm?.answer||buildExtractiveSummary(question,sources)
  const mode=llm?.mode||'extractive'

  return Response.json({
   answer,
   mode,
   sources:sources.map(({context,...rest})=>rest)
  },{headers:{'Cache-Control':'no-store'}})
 }catch(error){
  console.error('ask archive failed',error)
  return Response.json({error:'暂时无法检索档案，请稍后再试。'},{status:500})
 }
}
