'use client'

import {useState} from 'react'
import Link from 'next/link'
import PostBody from '../logs/[slug]/post-body'

const TYPE_LABEL={post:'日志',book:'书单',weibo:'微博'}
const SAMPLE_QUESTIONS=[
 '对何伟怎么看？',
 '在南开六年印象最深的事？',
 '为什么要读脂批本红楼梦？',
 '关于乡村与水岚村写了什么？',
 '对 AI 与自建网站有什么思考？'
]

export default function AskArchive(){
 const [question,setQuestion]=useState('')
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [result,setResult]=useState(null)

 async function runAsk(raw){
  if(loading)return
  const q=raw.trim()
  if(q.length<2)return setError('请输入至少 2 个字的问题。')
  setLoading(true)
  setError('')
  try{
   const res=await fetch('/api/ask',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:q})})
   const data=await res.json().catch(()=>({}))
   setLoading(false)
   if(!res.ok)return setError(data.error||'暂时无法检索，请稍后再试。')
   setResult(data)
  }catch{
   setLoading(false)
   setError('网络异常，请稍后再试。')
  }
 }

 function submit(e){
  e.preventDefault()
  runAsk(question)
 }

 return <section className="ask-archive" aria-label="向档案提问">
  <form onSubmit={submit}>
   <label htmlFor="ask-q">提问</label>
   <input id="ask-q" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="例如：对何伟怎么看？南开六年印象最深的事？" maxLength={160}/>
   <button disabled={loading}>{loading?'思考中…':'问问档案'}</button>
  </form>
  <div className="ask-samples" aria-label="示例问题">
   {SAMPLE_QUESTIONS.map(q=><button type="button" key={q} onClick={()=>{setQuestion(q);runAsk(q)}} disabled={loading}>{q}</button>)}
  </div>
  {error&&<p className="ask-error" role="status">{error}</p>}
  {result&&<div className="ask-result">
   {result.mode&&result.mode!=='empty'&&<span className="ask-badge">{result.mode==='ai'?'AI 综合回答':'档案智能摘要'}</span>}
   <div className="ask-answer"><PostBody body={result.answer}/></div>
   {result.sources?.length>0&&<div className="ask-sources">
    {result.sources.map((s,i)=><Link href={s.url} key={`${s.url}-${i}`}>
     <small>[{i+1}] {TYPE_LABEL[s.type]||s.type} · {s.date}</small>
     <h3>{s.title}</h3>
     {s.snippet&&<p>{s.snippet}</p>}
    </Link>)}
   </div>}
  </div>}
 </section>
}
