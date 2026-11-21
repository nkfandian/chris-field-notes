'use client'

import {useState} from 'react'
import Link from 'next/link'

const TYPE_LABEL={post:'日志',book:'书单',weibo:'微博'}

export default function AskArchive(){
 const [question,setQuestion]=useState('')
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [result,setResult]=useState(null)

 async function submit(e){
  e.preventDefault()
  if(loading)return
  const q=question.trim()
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

 return <section className="ask-archive" aria-label="向档案提问">
  <form onSubmit={submit}>
   <label htmlFor="ask-q">提问</label>
   <input id="ask-q" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="例如：对何伟怎么看？南开六年印象最深的事？" maxLength={160}/>
   <button disabled={loading}>{loading?'检索中…':'问问档案'}</button>
  </form>
  {error&&<p className="ask-error" role="status">{error}</p>}
  {result&&<div className="ask-result">
   <p className="ask-answer">{result.answer}</p>
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
