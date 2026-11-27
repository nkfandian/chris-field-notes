import {createAdminClient} from '@/lib/supabase/admin'
import {createPublicClient,isConfigured} from '@/lib/supabase/server'
import {cleanText,clientKey,enforceRateLimit,jsonMutationGuard,parseJsonBody} from '@/lib/security'
import {plainText} from '@/lib/seo'

export const maxDuration=60

function redact(s){
 return String(s||'')
  .replace(/范典/g,'Chris')
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[邮箱已隐藏]')
  .replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g,'[号码已隐藏]')
}

function tokenize(q){
 const cleaned=String(q||'').toLowerCase().replace(/[？?！!。，、；：“”"'（）()《》〈〉「」]/g,' ').trim()
 const out=new Set()
 for(const part of cleaned.split(/\s+/).filter(Boolean)){
  if(part.length>=2)out.add(part)
  const chars=[...part]
  if(chars.length>=2&&/[\u4e00-\u9fa5]/.test(part)){
   for(let i=0;i<chars.length-1;i++)out.add(chars[i]+chars[i+1])
  }
 }
 return [...out]
}

async function fetchReadBooks(){
 const now=Date.now()
 const cached=globalThis.__bookRxCache
 if(cached&&now-cached.ts<60000)return cached.books
 const db=createPublicClient()
 const rows=[]
 for(let from=0;from<5000;from+=1000){
  const {data}=await db.from('books').select('id,title,author,cover_url,status,rating,review,language,custom_lists,linked_post_slug,created_at').eq('status','Read').order('created_at',{ascending:false}).range(from,from+999)
  if(!data||!data.length)break
  rows.push(...data)
  if(data.length<1000)break
 }
 globalThis.__bookRxCache={ts:now,books:rows}
 return rows
}

function selectCandidatePool(readBooks,promptText){
 const tokens=tokenize(promptText)
 const eligible=readBooks.filter(b=>(b.rating||0)>=4&&plainText(b.review||'').length>=18)
 const scored=eligible.map(b=>{
  const hay=`${b.title||''} ${b.author||''} ${(b.custom_lists||[]).join(' ')} ${b.review||''}`.toLowerCase()
  let s=(b.rating||0)>=5?3:1.5
  for(const t of tokens){
   if(hay.includes(t))s+=(t.length>=3?5:2)
  }
  // 排除访客自己已经点名提到的同款书，避免把访客刚说读过的书又开回给他
  const mainTitle=String(b.title||'').split(/[:：（）()]/)[0].trim().toLowerCase()
  if(mainTitle.length>=2&&promptText.toLowerCase().includes(mainTitle))s=-99
  return {b,s}
 }).filter(x=>x.s>=0)

 scored.sort((a,b)=>b.s-a.s||plainText(b.b.review||'').length-plainText(a.b.review||'').length)
 const topMatched=scored.slice(0,24).map(x=>x.b)
 const used=new Set(topMatched.map(b=>b.id))
 // 再按不同分类补充代表性五星好书，保证跨领域联想度
 const rest=eligible.filter(b=>!used.has(b.id)&&(b.rating||0)>=5)
 for(let i=rest.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1))
  ;[rest[i],rest[j]]=[rest[j],rest[i]]
 }
 return [...topMatched,...rest.slice(0,18)]
}

async function callGeminiRx(visitorInput,pool,totalRead){
 const catalog=pool.map((b,idx)=>{
  const rev=redact(plainText(b.review||'')).slice(0,140)
  const cats=(b.custom_lists||[]).filter(c=>c!=='豆瓣导入'&&c!=='历史日志关联').join('/')
  return `[#${idx+1}] id="${b.id}" | 《${b.title}》 | 原书作者：${b.author||'佚名'} | Chris评分：${b.rating}星${cats?` | 分类：${cats}`:''} | Chris短评：${rev}`
 }).join('\n')

 const systemPrompt=`你是 Chris 个人网站的「私人书方主理人」（基于 Chris 十八年来读过的 ${totalRead} 本已读书单与真实书评）。
访客会输入「他自己喜欢的几本书」或「他最近困惑的一个问题」。请你拿访客的输入与下方候选书池做一次「阅读品味对撞」，严格只输出合法的 JSON 对象（不要用 Markdown 代码块包裹），结构如下：
{
  "resonance": 78,
  "tasteNote": "一两句克制、敏锐、带点书卷气的品味对撞评语（指出访客的阅读偏好/困惑与 Chris 书架的哪条脉络同频或互补，像老朋友聊天，严禁商业吹捧或说教）。",
  "rxNote": "一句简短温暖的开方寄语（平实自然，不端架子）。",
  "picks": [
    { "id": "必须严格填写候选书池中真实存在的 id 字符串", "reason": "一两句话说明为什么针对访客的输入开出这本书（注意：书是原书作者写的，Chris 是阅读与推荐者，严禁把书说成 Chris 写的）" }
  ]
}
规则：
1. picks 必须恰好选 3 本书，且 id 必须 100% 来自下方候选书池，不得编造书目。
2. resonance 为 65 到 96 之间的整数，根据契合度自然给出。
3. 语言平实、真诚、克制，契合「面对复杂，保持欢喜」的基调，绝不用「第一、第二」「赋能」「疗愈」等套话。`

 const userPrompt=`访客输入：${visitorInput}\n\n=== Chris 高分已读候选书池 ===\n${catalog}`

 if(!process.env.GEMINI_API_KEY)return null
 const models=[
  ['gemini-2.5-flash',true,9500],
  ['gemini-2.5-flash-lite',true,8500],
  ['gemini-2.0-flash',false,8500]
 ]
 for(const [model,noThink,timeoutMs] of models){
  try{
   const generationConfig=noThink
    ?{temperature:0.55,responseMimeType:'application/json',thinkingConfig:{thinkingBudget:0}}
    :{temperature:0.55,responseMimeType:'application/json'}
   const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
     systemInstruction:{parts:[{text:systemPrompt}]},
     contents:[{parts:[{text:userPrompt}]}],
     generationConfig
    }),
    signal:AbortSignal.timeout(timeoutMs)
   })
   if(!res.ok)continue
   const data=await res.json()
   const raw=(data?.candidates?.[0]?.content?.parts||[]).map(p=>p?.thought?'':(p?.text||'')).join('').trim()
   if(!raw)continue
   const cleaned=raw.replace(/^```json\s*/i,'').replace(/```\s*$/,'').trim()
   const parsed=JSON.parse(cleaned)
   if(Array.isArray(parsed?.picks)&&parsed.picks.length>=1)return parsed
  }catch(err){
   console.error('book-rx gemini error',model,err?.message||err)
  }
 }
 return null
}

export async function POST(request){
 try{
  const blocked=jsonMutationGuard(request,4096)
  if(blocked)return blocked
  const parsed=await parseJsonBody(request,4096)
  if(parsed.response)return parsed.response
  const inputText=cleanText(parsed.data?.input,160)
  if(inputText.length<2)return Response.json({error:'请至少输入一本书名或一句近期的困惑。'},{status:400})

  let allowAI=false
  if(isConfigured()){
   try{
    const admin=createAdminClient()
    if(!await enforceRateLimit(admin,clientKey(request,'book-rx'),10,3600)){
     return Response.json({error:'开方请求过于频繁，请稍后再试。'},{status:429})
    }
    const dayKey=new Date().toISOString().slice(0,10)
    allowAI=await enforceRateLimit(admin,`ask-archive-global-daily:${dayKey}`,200,86400)
   }catch{
    return Response.json({error:'服务暂时繁忙，请稍后再试。'},{status:503})
   }
  }else{
   allowAI=true
  }

  const readBooks=isConfigured()?await fetchReadBooks():[]
  if(!readBooks.length){
   return Response.json({error:'书架数据正在准备中，请稍后再试。'},{status:503})
  }

  const pool=selectCandidatePool(readBooks,inputText)
  const byId=new Map(pool.map(b=>[String(b.id),b]))
  const aiResult=allowAI?await callGeminiRx(inputText,pool,readBooks.length):null

  let finalBooks=[]
  if(aiResult?.picks){
   for(const p of aiResult.picks){
    const hit=byId.get(String(p?.id||''))
    if(hit&&!finalBooks.some(x=>x.id===hit.id)){
     finalBooks.push({
      id:hit.id,
      title:hit.title,
      author:hit.author||'',
      cover_url:hit.cover_url||'',
      rating:hit.rating||5,
      readMonth:String(hit.created_at||'').slice(0,7),
      linked_post_slug:hit.linked_post_slug||'',
      review:redact(plainText(hit.review||'')).slice(0,220),
      reason:redact(cleanText(p.reason,180))
     })
    }
    if(finalBooks.length>=3)break
   }
  }
  for(const b of pool){
   if(finalBooks.length>=3)break
   if(!finalBooks.some(x=>x.id===b.id)){
    finalBooks.push({
     id:b.id,
     title:b.title,
     author:b.author||'',
     cover_url:b.cover_url||'',
     rating:b.rating||5,
     readMonth:String(b.created_at||'').slice(0,7),
     linked_post_slug:b.linked_post_slug||'',
     review:redact(plainText(b.review||'')).slice(0,220),
     reason:'从书架同频主题中为你挑出的高分读物。'
    })
   }
  }

  const resonance=Math.min(96,Math.max(68,Number(aiResult?.resonance)||82))
  const tasteNote=redact(cleanText(aiResult?.tasteNote,240))||'你的问题与我书架上关注历史肌理、个体处境的那批书很有共鸣。'
  const rxNote=redact(cleanText(aiResult?.rxNote,160))||'不必急着一次找齐答案，先翻开其中最吸引你的一本就好。'
  const serial=`RX-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${String(Math.floor(1000+Math.random()*9000))}`

  return Response.json({
   serial,
   date:new Date().toISOString().slice(0,10),
   input:inputText,
   resonance,
   tasteNote,
   rxNote,
   books:finalBooks
  },{headers:{'Cache-Control':'no-store'}})
 }catch(err){
  console.error('book-rx failed',err)
  return Response.json({error:'暂时无法生成书方，请稍后再试。'},{status:500})
 }
}
