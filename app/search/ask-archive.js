'use client'

import {useRef,useState} from 'react'
import Link from 'next/link'
import PostBody from '../logs/[slug]/post-body'

const TYPE_LABEL={post:'日志',book:'书单',weibo:'微博'}
const SAMPLE_QUESTIONS=[
 '对何伟怎么看？',
 '读过哪些印象最深的历史书？',
 '在南开六年印象最深的事？',
 '为什么要读脂批本红楼梦？',
 '你的阅读品味和知识结构是怎样的？'
]

export default function AskArchive(){
 const [question,setQuestion]=useState('')
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [messages,setMessages]=useState([])
 const bottomRef=useRef(null)

 async function runAsk(raw){
  if(loading)return
  const q=raw.trim()
  if(q.length<2)return setError('请输入至少 2 个字的问题。')
  setError('')
  setQuestion('')
  const nextMessages=[...messages,{id:Date.now(),role:'user',text:q}]
  setMessages(nextMessages)
  setLoading(true)
  setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'}),50)
  try{
   const history=nextMessages.slice(-5,-1).map(m=>({role:m.role,text:m.text}))
   const res=await fetch('/api/ask',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:q,history})})
   const data=await res.json().catch(()=>({}))
   setLoading(false)
   if(!res.ok)return setError(data.error||'暂时无法连接 AI 分身，请稍后再试。')
   setMessages([...nextMessages,{
    id:Date.now()+1,
    role:'assistant',
    text:data.answer||'',
    mode:data.mode||'extractive',
    sources:data.sources||[]
   }])
   setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'}),80)
  }catch{
   setLoading(false)
   setError('网络异常，请稍后再试。')
  }
 }

 function submit(e){
  e.preventDefault()
  runAsk(question)
 }

 return <section className="ai-chat-shell" aria-label="和 AI 作者对话">
  <div className="ai-chat-head">
   <div className="ai-chat-status"><span className="ai-dot" aria-hidden="true"/><strong>Chris · AI 分身</strong><small>基于 290 篇日志 · 1,065 本书单 · 1,813 条微博</small></div>
   {messages.length>0&&<button type="button" className="ai-reset" onClick={()=>{setMessages([]);setError('')}}>开启新对话</button>}
  </div>

  {!messages.length&&<form className="ai-chat-form ai-chat-form-top" onSubmit={submit}>
   <input id="ask-q" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="向 AI 作者提问，例如：对何伟怎么看？" maxLength={160} aria-label="向 AI 作者提问"/>
   <button disabled={loading}>{loading?'思考中…':'发送 ✦'}</button>
  </form>}

  <div className={`ai-chat-body${messages.length?'':' is-empty'}`}>
   {!messages.length&&<div className="ai-welcome">
    <p>你好，我是 Chris 的数字分身。已预装十八年全部长文、高分已读书单短评与微博随记，支持连续追问。</p>
    <div className="ask-samples" aria-label="示例问题">
     {SAMPLE_QUESTIONS.map(q=><button type="button" key={q} onClick={()=>runAsk(q)} disabled={loading}>✦ {q}</button>)}
    </div>
   </div>}

   {messages.map(m=>m.role==='user'
    ?<div className="ai-msg is-user" key={m.id}><div className="ai-bubble">{m.text}</div></div>
    :<div className="ai-msg is-assistant" key={m.id}>
     <div className="ai-msg-meta"><span className="ask-badge">{m.mode==='ai'?'✦ AI 分身回答':'档案智能摘要'}</span></div>
     <div className="ai-bubble ask-answer"><PostBody body={m.text}/></div>
     {m.sources?.length>0&&<details className="ai-citations">
      <summary>查看 {m.sources.length} 条引用原文出处</summary>
      <div className="ask-sources">
       {m.sources.map((s,i)=><Link href={s.url} key={`${s.url}-${i}`}>
        <small>[{i+1}] {TYPE_LABEL[s.type]||s.type} · {s.date}</small>
        <h3>{s.title}</h3>
        {s.snippet&&<p>{s.snippet}</p>}
       </Link>)}
      </div>
     </details>}
    </div>)}

   {loading&&<div className="ai-msg is-assistant"><div className="ai-bubble ai-typing"><span/><span/><span/><em>正在翻阅十八年档案并组织回答…</em></div></div>}
   <div ref={bottomRef}/>
  </div>

  {error&&<p className="ask-error" role="status">{error}</p>}

  {messages.length>0&&<form className="ai-chat-form ai-chat-form-bottom" onSubmit={submit}>
   <input id="ask-q" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="继续追问 AI 作者…" maxLength={160} aria-label="继续追问 AI 作者"/>
   <button disabled={loading}>{loading?'思考中…':'发送 ✦'}</button>
  </form>}
 </section>
}
