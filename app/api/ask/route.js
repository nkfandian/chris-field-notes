import {createAdminClient} from '@/lib/supabase/admin'
import {createPublicClient,isConfigured} from '@/lib/supabase/server'
import {demoPosts} from '@/lib/demo'
import {listPublicWeibos} from '@/lib/weibo'
import {cleanText,clientKey,enforceRateLimit,jsonMutationGuard,parseJsonBody} from '@/lib/security'
import {plainText} from '@/lib/seo'

const STOP_WORDS=new Set([
 '怎么','怎样','如何','什么','为什么','为何','哪些','哪个','哪里','是否','有没有','是不是','能不能','可以','能够',
 '觉得','认为','看法','评价','态度','观点','印象','最深','关于','以及','还有','或者','因为','所以','只是','但是',
 '这个','那个','这些','那些','一个','一种','自己','我们','他们','它们','时候','东西','事情','很多','非常','特别',
 '一些','一点','一下','比较','其实','大概','可能','应该','还是','不过','虽然','如果','那么','这样','那样','的书',
 '的人','的事','问题','内容','部分','方面','地方','这里','那里','今天','现在','以前','之前','之后','以后','最近',
 '几本','多少','几篇','几条','有没有','很多遍','一遍','几遍'
])

const QUERY_SYNONYMS=[
 ['重读',['再读','重温','每年读','读过几遍','翻出来','十次','红楼梦']],
 ['何伟',['彼得·海斯勒','海斯勒','hessler','寻路中国','江城','甲骨文','奇石','other rivers']],
 ['非虚构',['纪实','报道','特稿','新闻','采访']],
 ['红楼梦',['脂批','石头记','庚辰本','曹雪芹','黛玉','宝玉']],
 ['南开',['天津','大学','本科','研究生','六年']],
 ['台湾',['台北','高雄','环岛','宝岛']],
 ['乡村',['农村','家乡','水岚村','村里','县城']]
]

function tokenizeQuery(q){
 const cleaned=String(q||'').toLowerCase().replace(/[？?！!。，、；：“”"'（）()《》〈〉「」]/g,' ').trim()
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
 for(const [kw,syns] of QUERY_SYNONYMS){
  if(cleaned.includes(kw)){
   for(const s of syns)raw.add(s)
  }
 }
 const filtered=[...raw].filter(t=>t.length>=2&&!STOP_WORDS.has(t)&&!t.startsWith('的')&&!t.endsWith('的'))
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

function buildReadingBackground(books,posts=[]){
 const readBooks=books.filter(b=>b.status==='Read')
 const parts=[]
 if(posts.length){
  const domainCounts={}
  for(const p of posts){
   const d=p.domain||'其他'
   domainCounts[d]=(domainCounts[d]||0)+1
  }
  const topDomains=Object.entries(domainCounts).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([d,n])=>`${d}(${n}篇)`).join('、')
  parts.push(`Chris 从 2008 年至今共写下 ${posts.length} 篇公开日志，主要围绕：${topDomains}。`)
 }
 if(readBooks.length){
  const catCounts={}
  for(const b of readBooks){
   for(const c of (b.custom_lists||[])){
    if(c&&c!=='豆瓣导入'&&c!=='历史日志关联')catCounts[c]=(catCounts[c]||0)+1
   }
  }
  const topCats=Object.entries(catCounts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([c,n])=>`${c}(${n}本)`).join('、')
  // 精选已读且高分(4-5星)并写有实质短评的代表作作为长期阅读背景，明确标注原书作者
  const highlights=readBooks
   .filter(b=>(b.rating||0)>=4&&plainText(b.review||'').length>=20)
   .sort((a,b)=>(b.rating||0)-(a.rating||0)||plainText(b.review||'').length-plainText(a.review||'').length)
   .slice(0,26)
   .map(b=>{
    const rev=plainText(b.review||'').slice(0,110)
    return `- 《${b.title}》（原书作者：${b.author||'他人'}，Chris 评分 ${b.rating}星）：${rev}${plainText(b.review||'').length>110?'…':''}`
   })
  parts.push(`Chris 已读共 ${readBooks.length} 本他人著作${topCats?`，主要集中在：${topCats}`:''}。\n以下高分（4–5 星）且写有短评的已读书籍代表了他的核心阅读品味与思考底色（注意：这些书均为原书作者所著，非 Chris 所写）：\n${highlights.join('\n')}`)
 }
 return parts.join('\n\n')
}

function selectDiverseSources(candidates,limit=16){
 const picked=[]
 const used=new Set()
 const takeByType=(type,quota)=>{
  let count=0
  for(let i=0;i<candidates.length&&count<quota;i++){
   if(candidates[i].type===type&&!used.has(i)){
    picked.push(candidates[i])
    used.add(i)
    count+=1
   }
  }
 }
 takeByType('post',7)
 takeByType('book',5)
 takeByType('weibo',4)
 for(let i=0;i<candidates.length&&picked.length<limit;i++){
  if(!used.has(i)){
   picked.push(candidates[i])
   used.add(i)
  }
 }
 return picked.sort((a,b)=>b.score-a.score)
}

async function callLLM(question,sources,readingBackground='',history=[],liveStats=''){
 const context=sources.map((s,i)=>{
  if(s.type==='book'){
   return `[${i+1}] 【Chris 读过的他人著作（书单短评，非 Chris 所著！）· 原书作者：${s.bookAuthor||'他人'} · ${s.date}】《${s.bookTitle||s.title}》\nChris 的阅读记录与短评：${s.context||s.snippet}`
  }
  if(s.type==='weibo'){
   return `[${i+1}] 【Chris 原创微博 · ${s.date}】${s.title}\n${s.context||s.snippet}`
  }
  return `[${i+1}] 【Chris 原创日志 · ${s.date}】《${s.title}》\n${s.context||s.snippet}`
 }).join('\n\n')
 const todayDate=new Date().toISOString().slice(0,10)
 const systemPrompt=`你是 Chris 个人网站的 AI 作者分身，基于他从 2008 年至今的真实阅读与写作构建（当前日期：${todayDate}）。请严格基于下方提供的检索片段、已读高分书单背景与全站统计来回答读者问题：\n1.【文风与表达铁律】请完全采用 Chris 本人的随笔口吻：平实、克制、真诚、有具体细节，带一点田野观察者的冷静与温情（「面对复杂，保持欢喜」）。像给老朋友回信或写阅读随笔一样用流畅的自然段展开，紧扣上下文把具体书名、作者、年份和思考脉络自然揉进句子里。严禁使用「第一、第二、第三」「首先、其次、最后」「总结起来」「你可以试着……」这类 AI 说教模板或公众号攻略体，也不要每段开头都加粗口号式小标题。只引用真正紧扣当前问题的片段，与问题关联度低的检索片段直接忽略、不要生硬硬凑；不要编造原文之外的事实，引用具体片段时在句末标注 [1] [2] 出处。\n2.【时间锚点铁律】每条检索片段都带有实际写作日期（如 2018、2024、2025）。旧文章里若出现「今年」「去年」「最近」等相对时间词，回答时必须对照文章实际日期与当前日期（${todayDate}）换算成准确表述（如「2024 年」「前些年」「那阵子」），绝不能把几年前的事原样说成「今年」或「最近」。\n3.【著作权与归属铁律】必须严格区分「Chris 自己写的日志/微博」和「Chris 读过的他人著作」！凡是标注为「Chris 读过的他人著作」的书单条目，原书都是别的作家写的，绝不能说「我在《某本书》里写了/记录了……」或「我写的《某本书》」，只能说「我在读某某写的《某本书》时……」「我给《某本书》打过几星、在短评里提到……」，书中的人物、故事与观点也必须明确归属给原书作者。同时，文章里记录、采访或描写的他人经历，绝不能用第一人称「我」认领，必须明确归属到具体人物身上。\n4.【隐私保护铁律】作者对外统一使用英文名 Chris，绝不要透露作者的真实中文姓名、手机号、邮箱、家庭住址、具体工作单位或证件号等个人隐私，若读者追问请礼貌拒绝。`
 const bgBlock=readingBackground?`\n\n=== Chris 已读书单与核心书评背景 ===\n${readingBackground}`:''
 const histBlock=history.length?`\n\n=== 最近对话上下文 ===\n${history.map(h=>`${h.role==='user'?'读者':'AI Chris'}：${String(h.text||'').slice(0,280)}`).join('\n')}`:''
 const statsBlock=liveStats?`\n\n=== 全站实时统计（数据库最新数据） ===\n${liveStats}\n回答涉及数量的问题（如多少篇日志、多少条微博、读了多少本书）时，一律以这里的实时统计为准，不要引用检索片段或文章里提到的旧数字——文章成文时的数字可能已过时。`:''
 const userPrompt=`读者当前提问：${question}${histBlock}\n\n=== 本次最相关的检索片段 ===\n${context}${bgBlock}${statsBlock}`

 let lastReason='no_key'
 if(process.env.GEMINI_API_KEY){
  const geminiModels=['gemini-2.5-flash','gemini-2.5-flash-lite','gemini-flash-latest','gemini-3-flash-preview']
  for(const model of geminiModels){
   for(let attempt=0;attempt<2;attempt++){
    try{
     const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
       systemInstruction:{parts:[{text:systemPrompt}]},
       contents:[{parts:[{text:userPrompt}]}]
      }),
      signal:AbortSignal.timeout(12000)
     })
     if(res.ok){
      const gData=await res.json()
      const text=gData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if(text)return {answer:text,mode:'ai',reason:'ok'}
      lastReason=`empty_${model}`
      break
     }else{
      lastReason=`http_${res.status}_${model}`
      console.error('ask gemini error',model,res.status,await res.text().catch(()=>''))
      if((res.status===503||res.status===429)&&attempt===0){
       await new Promise(r=>setTimeout(r,600))
       continue
      }
      break
     }
    }catch(err){
     lastReason=`err_${model}`
     console.error('ask gemini exception',model,err?.message||err)
     break
    }
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
  const blocked=jsonMutationGuard(request,8192)
  if(blocked)return blocked
  const parsed=await parseJsonBody(request,8192)
  if(parsed.response)return parsed.response
  const question=cleanText(parsed.data?.question,160)
  if(question.length<2)return Response.json({error:'请输入至少 2 个字的问题。'},{status:400})
  const history=Array.isArray(parsed.data?.history)?parsed.data.history.slice(-4).map(h=>({role:h?.role==='user'?'user':'assistant',text:cleanText(h?.text,300)})):[]

  let allowDailyAI=false
  if(isConfigured()){
   try{
    const admin=createAdminClient()
    if(!await enforceRateLimit(admin,clientKey(request,'ask-archive'),15,3600)){
     return Response.json({error:'提问过于频繁，请稍后再试。'},{status:429})
    }
    const dayKey=new Date().toISOString().slice(0,10)
    allowDailyAI=await enforceRateLimit(admin,`ask-archive-global-daily:${dayKey}`,200,86400)
   }catch(err){
    console.error('ask rate limit error',err)
    return Response.json({error:'限流服务暂时不可用，请稍后再试。'},{status:503})
   }
  }else{
   allowDailyAI=true
  }

  let posts=demoPosts,books=[],weibos=[]
  if(isConfigured()){
   const now=Date.now()
   const cached=globalThis.__askArchiveCache
   if(cached&&now-cached.ts<60000){
    posts=cached.posts;books=cached.books;weibos=cached.weibos
   }else{
    const db=createPublicClient()
    const [p,b,w]=await Promise.all([
     fetchAllTable(db,'posts','slug,title,excerpt,body,published_at,domain','published_at',false),
     fetchAllTable(db,'books','id,title,author,status,rating,review,custom_lists,linked_post_slug,created_at','created_at',false),
     listPublicWeibos({limit:5000,withComments:false})
    ])
    posts=p
    books=b
    weibos=w||[]
    globalThis.__askArchiveCache={ts:now,posts,books,weibos}
   }
  }

  const tokens=tokenizeQuery(question)
  const candidates=[]

  for(const p of posts){
   const titleScore=scoreText(p.title,tokens,question)*3.5
   const excerptScore=scoreText(p.excerpt,tokens,question)*1.6
   const bodyScore=scoreText(p.body,tokens,question)
   const total=titleScore+excerptScore+bodyScore
   if(total>0){
    const {snippet,context}=topParagraphs(p.body||p.excerpt,tokens,question,3,950)
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
    const total=base*1.5*statusWeight*ratingWeight*reviewWeight
    const rev=plainText(b.review||'')
    const metaTag=[b.status==='Read'?'已读':b.status==='Reading'?'在读':'想读',b.rating?`${b.rating}星`:'',String(b.created_at||'').slice(0,7)].filter(Boolean).join(' · ')
    candidates.push({
     type:'book',
     score:total,
     title:`${b.title}${b.author?` · ${b.author}`:''}`,
     bookTitle:b.title,
     bookAuthor:b.author||'他人',
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
     url:`/weibo?focus=${encodeURIComponent(w.slug)}#${encodeURIComponent(w.slug)}`,
     snippet:text.slice(0,220),
     context:text.slice(0,500)
    })
   }
  }

  candidates.sort((a,b)=>b.score-a.score)
  const redact=s=>String(s||'')
   .replace(/范典/g,'Chris')
   .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[邮箱已隐藏]')
   .replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g,'[号码已隐藏]')
   .replace(/(?<!\d)\d{17}[\dXx](?!\d)/g,'[证件号已隐藏]')
  const sources=selectDiverseSources(candidates,16).map(s=>({...s,title:redact(s.title),bookTitle:redact(s.bookTitle),bookAuthor:redact(s.bookAuthor),snippet:redact(s.snippet),context:redact(s.context)}))

  if(!sources.length){
   const emptyAnswer='档案中没有找到与这个问题直接相关的记录，你可以换个关键词试试。'
   if(isConfigured()){
    try{
     await createAdminClient().from('ask_logs').insert({
      question,
      answer:emptyAnswer,
      mode:'empty',
      ai_status:'no_sources',
      source_count:0,
      sources:[],
      session_hash:clientKey(request,'ask-log')
     })
    }catch{}
   }
   return Response.json({
    answer:emptyAnswer,
    mode:'empty',
    sources:[]
   },{headers:{'Cache-Control':'no-store'}})
  }

  const readingBackground=redact(buildReadingBackground(books,posts))
  const readCount=books.filter(b=>b.status==='Read').length
  const liveStats=`- 日志：${posts.length} 篇\n- 微博：${weibos.length} 条\n- 已读书单：${readCount} 本`
  const llm=allowDailyAI?await callLLM(question,sources,readingBackground,history,liveStats):{reason:'daily_cap'}
  const answer=redact(llm?.answer||buildExtractiveSummary(question,sources))
  const mode=llm?.mode||'extractive'
  const publicSources=sources.map(({context,bookTitle,bookAuthor,...rest})=>rest)

  if(isConfigured()){
   try{
    await createAdminClient().from('ask_logs').insert({
     question,
     answer,
     mode,
     ai_status:llm?.reason||'unknown',
     source_count:publicSources.length,
     sources:publicSources.map(({type,title,date,url})=>({type,title,date,url})),
     session_hash:clientKey(request,'ask-log')
    })
   }catch{}
  }

  return Response.json({
   answer,
   mode,
   ai_status:llm?.reason||'unknown',
   sources:publicSources
  },{headers:{'Cache-Control':'no-store'}})
 }catch(error){
  console.error('ask archive failed',error)
  return Response.json({error:'暂时无法检索档案，请稍后再试。'},{status:500})
 }
}
