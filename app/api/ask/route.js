import {createAdminClient} from '@/lib/supabase/admin'
import {createPublicClient,isConfigured} from '@/lib/supabase/server'
import {demoPosts} from '@/lib/demo'
import {listPublicWeibos} from '@/lib/weibo'
import {cleanText,clientKey,enforceRateLimit,jsonMutationGuard,parseJsonBody} from '@/lib/security'
import {plainText} from '@/lib/seo'

function tokenizeQuery(q){
 const cleaned=String(q||'').toLowerCase().replace(/[？?！!。，、；：“”"'（）()《》]/g,' ').trim()
 const tokens=new Set()
 for(const part of cleaned.split(/\s+/).filter(Boolean)){
  tokens.add(part)
  const chars=[...part]
  if(chars.length>=2&&/[\u4e00-\u9fa5]/.test(part)){
   for(let i=0;i<chars.length-1;i++)tokens.add(chars[i]+chars[i+1])
  }
 }
 return [...tokens].filter(t=>t.length>=2)
}

function scoreText(text,tokens,rawQuery){
 const hay=String(text||'').toLowerCase()
 if(!hay)return 0
 let score=hay.includes(rawQuery.toLowerCase())?8:0
 for(const t of tokens){
  if(hay.includes(t))score+=(t.length>=3?3:1.5)
 }
 return score
}

function bestParagraph(body,tokens,rawQuery){
 const paras=String(body||'').split(/\n\s*\n+/).map(p=>plainText(p)).filter(p=>p.length>=15)
 if(!paras.length)return ''
 let best='',bestScore=-1
 for(const p of paras){
  const s=scoreText(p,tokens,rawQuery)
  if(s>bestScore){bestScore=s;best=p}
 }
 return best.length>220?`${best.slice(0,218)}…`:best
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
    if(!await enforceRateLimit(admin,clientKey(request,'ask-archive'),20,3600)){
     return Response.json({error:'提问过于频繁，请稍后再试。'},{status:429})
    }
   }catch{}
  }

  let posts=demoPosts,books=[],weibos=[]
  if(isConfigured()){
   const db=createPublicClient()
   const [{data:p},{data:b},w]=await Promise.all([
    db.from('posts').select('slug,title,excerpt,body,published_at,domain').eq('status','published').order('published_at',{ascending:false}).limit(250),
    db.from('books').select('id,title,author,review,linked_post_slug').limit(400),
    listPublicWeibos({limit:150,withComments:false})
   ])
   posts=p||[]
   books=b||[]
   weibos=w||[]
  }

  const tokens=tokenizeQuery(question)
  const candidates=[]

  for(const p of posts){
   const titleScore=scoreText(p.title,tokens,question)*3
   const excerptScore=scoreText(p.excerpt,tokens,question)*1.5
   const bodyScore=scoreText(p.body,tokens,question)
   const total=titleScore+excerptScore+bodyScore
   if(total>0){
    candidates.push({
     type:'post',
     score:total,
     title:p.title,
     date:String(p.published_at||'').slice(0,10),
     url:`/logs/${encodeURIComponent(p.slug)}`,
     snippet:bestParagraph(p.body||p.excerpt,tokens,question)||p.excerpt||''
    })
   }
  }

  for(const b of books){
   const total=scoreText(`${b.title} ${b.author} ${b.review}`,tokens,question)*2
   if(total>0){
    candidates.push({
     type:'book',
     score:total,
     title:`《${b.title}》${b.author?` · ${b.author}`:''}`,
     date:'书单',
     url:`/books#book-${b.id}`,
     snippet:plainText(b.review||'').slice(0,200)
    })
   }
  }

  for(const w of weibos){
   const total=scoreText(w.body,tokens,question)*1.5
   if(total>0){
    const text=plainText(w.body)
    candidates.push({
     type:'weibo',
     score:total,
     title:text.slice(0,36)+(text.length>36?'…':''),
     date:String(w.published_at||'').slice(0,10),
     url:`/weibo#${encodeURIComponent(w.slug)}`,
     snippet:text.slice(0,200)
    })
   }
  }

  candidates.sort((a,b)=>b.score-a.score)
  const sources=candidates.slice(0,5)

  let answer=''
  if(!sources.length){
   answer='档案中没有找到与这个问题直接相关的记录，你可以换个关键词试试。'
  }else if(process.env.GEMINI_API_KEY){
   try{
    const context=sources.map((s,i)=>`[${i+1}] ${s.title} (${s.date}): ${s.snippet}`).join('\n')
    const geminiRes=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,{
     method:'POST',
     headers:{'content-type':'application/json'},
     body:JSON.stringify({
      contents:[{parts:[{text:`你是 Chris 个人网站的档案助手。请严格根据以下原文片段回答读者问题，不要编造原文之外的内容，在合适的地方标注 [1] [2] 等出处序号。\n\n问题：${question}\n\n原文片段：\n${context}`}]}]
     }),
     signal:AbortSignal.timeout(12000)
    })
    if(geminiRes.ok){
     const gData=await geminiRes.json()
     answer=gData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()||''
    }
   }catch{}
  }

  if(!answer&&sources.length){
   answer=`在过往档案中，有 ${sources.length} 条最相关的记录提到了这个主题，核心片段如下：`
  }

  return Response.json({answer,sources},{headers:{'Cache-Control':'no-store'}})
 }catch(error){
  console.error('ask archive failed',error)
  return Response.json({error:'暂时无法检索档案，请稍后再试。'},{status:500})
 }
}
