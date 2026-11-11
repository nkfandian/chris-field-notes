'use client'
import {useState} from 'react'
import Link from 'next/link'

const statusLabel={pending:'待审核',approved:'已公开',rejected:'已拒绝'}
const messageStatusLabel={pending:'待处理',approved:'已归档',rejected:'已忽略'}

async function moderate(action,id,body){
 const response=await fetch('/api/studio/comments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,id,body})})
 const data=await response.json().catch(()=>({}))
 if(!response.ok)throw new Error(data.error||'暂时无法处理，请稍后再试。')
 return data
}

export default function CommentModeration({initial,posts={}}){
 const [items,setItems]=useState(initial)
 const [filter,setFilter]=useState('pending')
 const [notice,setNotice]=useState('')
 const [drafts,setDrafts]=useState({})
 const [busyId,setBusyId]=useState(null)

 // 回复行只嵌套在原评论下显示，不单独成卡。
 const roots=items.filter(x=>!x.parent_id)
 const repliesOf=id=>items.filter(x=>x.parent_id===id).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at))
 const filtered=filter==='all'?roots:roots.filter(x=>x.status===filter)
 const shownComments=filtered.filter(x=>x.kind==='comment')
 const shownMessages=filtered.filter(x=>x.kind!=='comment')
 // 同一篇文章下内容完全相同的行打上疑似重复标记：通常是提交时点了两次。
 const dupCounts={}
 for(const x of roots){const key=`${x.post_slug||''}\n${x.body}`;dupCounts[key]=(dupCounts[key]||0)+1}
 const isDup=x=>dupCounts[`${x.post_slug||''}\n${x.body}`]>1

 async function change(id,status){
  const target=items.find(x=>x.id===id)
  const isMsg=target?.kind==='message'
  setBusyId(id)
  try{
   const data=await moderate(status==='approved'?'approve':'reject',id)
   setItems(prev=>prev.map(x=>x.id===id?{...x,status:data.status||status}:x))
   setNotice(data.already?'已经是这个状态了':status==='approved'?(isMsg?'已归档':'已公开'):(isMsg?'已忽略':'已拒绝'))
  }catch(error){setNotice(error.message)}
  setBusyId(null)
 }

 async function remove(id){
  if(!confirm('确定永久删除这条内容？'))return
  setBusyId(id)
  try{
   await moderate('delete',id)
   setItems(prev=>prev.filter(x=>x.id!==id&&x.parent_id!==id))
   setNotice('已删除')
  }catch(error){setNotice(error.message)}
  setBusyId(null)
 }

 async function reply(id){
  const body=(drafts[id]||'').trim()
  if(body.length<2)return setNotice('回复内容至少 2 个字。')
  const target=items.find(x=>x.id===id)
  const wasPending=target?.status==='pending'
  const approvedNote=wasPending?(target?.kind==='message'?'，留言已归档':'，原评论已公开'):''
  setBusyId(id)
  try{
   const data=await moderate('reply',id,body)
   setItems(prev=>{
    const next=prev.map(x=>x.id===id&&data.parentApproved?{...x,status:'approved'}:x)
    return data.reply?[...next,data.reply]:next
   })
   setDrafts(prev=>({...prev,[id]:''}))
   setNotice(data.emailSent?`已回复${approvedNote}，邮件已发送`:`已回复${approvedNote}，但邮件发送失败：${data.emailError||'未知原因'}`)
  }catch(error){setNotice(error.message)}
  setBusyId(null)
 }

 function renderCard(x){
  const isMsg=x.kind==='message'
  const labels=isMsg?messageStatusLabel:statusLabel
  return <article key={x.id}>
   <header><div><span>{labels[x.status]}</span>{isDup(x)&&<span className="moderation-dup">疑似重复</span>}</div><time>{new Date(x.created_at).toLocaleString('zh-CN')}</time></header>
   <h3>{x.name}</h3>
   <a href={`mailto:${x.email}`}>{x.email}</a>
   {x.post_slug&&<p className="moderation-target">文章：<a href={`/logs/${encodeURIComponent(x.post_slug)}`} target="_blank" rel="noreferrer">{posts[x.post_slug]||x.post_slug} ↗</a></p>}
   <p className="moderation-body">{x.body}</p>
   {repliesOf(x.id).length>0&&<div className="moderation-replies">{repliesOf(x.id).map(r=><div className="moderation-reply" key={r.id}>
    <header><b>站长回复</b><time>{new Date(r.created_at).toLocaleString('zh-CN')}</time></header>
    <p>{r.body}</p>
    <button onClick={()=>remove(r.id)}>删除回复</button>
   </div>)}</div>}
   {x.status!=='rejected'&&<div className="moderation-reply-form">
    <textarea value={drafts[x.id]||''} onChange={e=>setDrafts(prev=>({...prev,[x.id]:e.target.value}))} rows="3" maxLength="2000" placeholder="写下给对方的回复，发送后会邮件提醒对方…" />
    <button disabled={busyId===x.id} onClick={()=>reply(x.id)}>{busyId===x.id?'发送中…':'回复并邮件通知'}</button>
   </div>}
   <footer>
    {x.status!=='approved'&&<button disabled={busyId===x.id} onClick={()=>change(x.id,'approved')}>{isMsg?'标记已读':'通过并公开'}</button>}
    {x.status!=='rejected'&&<button disabled={busyId===x.id} onClick={()=>change(x.id,'rejected')}>{isMsg?'忽略':'拒绝'}</button>}
    <button className="danger" disabled={busyId===x.id} onClick={()=>remove(x.id)}>删除</button>
   </footer>
  </article>
 }

 return <main className="studio moderation">
  <header><div><h1>互动审核</h1></div><div><Link href="/studio">文章编辑</Link>　<Link href="/studio/site">网站内容</Link>　<Link href="/">查看网站 ↗</Link></div></header>
  <div className="moderation-filters">{[['pending','待审核'],['approved','已公开'],['rejected','已拒绝'],['all','全部']].map(([k,v])=><button className={filter===k?'active':''} onClick={()=>setFilter(k)} key={k}>{v} {k==='all'?roots.length:roots.filter(x=>x.status===k).length}</button>)}</div>
  <p className="moderation-notice">{notice}</p>
  <div className="moderation-panels">
   <section className="moderation-panel">
    <header><h2>日志评论</h2><span>{shownComments.length} 条</span></header>
    <div className="moderation-list">{shownComments.map(renderCard)}</div>
    {!shownComments.length&&<p>当前没有此状态的日志评论。</p>}
   </section>
   <section className="moderation-panel">
    <header><h2>网站留言</h2><span>{shownMessages.length} 条</span></header>
    <div className="moderation-list">{shownMessages.map(renderCard)}</div>
    {!shownMessages.length&&<p>当前没有此状态的网站留言。</p>}
   </section>
  </div>
 </main>
}
