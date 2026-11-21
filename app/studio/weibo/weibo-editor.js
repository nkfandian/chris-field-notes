'use client'

import {useRef,useState} from 'react'
import Link from 'next/link'
import MarkdownEditor from '../markdown-editor'

function toLocalInput(iso){
 const d=iso?new Date(iso):new Date()
 if(Number.isNaN(d.getTime()))return new Date().toISOString().slice(0,16)
 const offset=d.getTimezoneOffset()*60000
 return new Date(d.getTime()-offset).toISOString().slice(0,16)
}

function formatListTime(iso){
 if(!iso)return ''
 const d=new Date(iso)
 if(Number.isNaN(d.getTime()))return String(iso)
 return d.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})
}

function previewText(body=''){
 const text=String(body||'').replace(/!\[[^\]]*\]\([^)]*\)/g,'[图片]').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[`#>*_~]/g,' ').replace(/\s+/g,' ').trim()
 return text.length>42?`${text.slice(0,42)}…`:text||'（空内容）'
}

const makeBlank=()=>({body:'',status:'published',published_at:toLocalInput()})

export default function WeiboEditor({initialWeibos=[]}){
 const editorRef=useRef(null)
 const [weibos,setWeibos]=useState(initialWeibos)
 const [edit,setEdit]=useState(makeBlank)
 const [notice,setNotice]=useState('')
 const [saving,setSaving]=useState(false)

 function choose(item){
  setEdit(item?.id?{...item,published_at:toLocalInput(item.published_at)}:makeBlank())
  setNotice('')
  if(window.matchMedia('(max-width: 700px)').matches)requestAnimationFrame(()=>editorRef.current?.scrollIntoView({behavior:'smooth',block:'start'}))
 }

 async function save(e){
  e.preventDefault()
  if(saving)return
  if(!String(edit.body||'').trim())return setNotice('微博内容不能为空')
  setSaving(true)
  setNotice('正在保存…')
  try{
   const publishedAt=edit.published_at?new Date(edit.published_at).toISOString():new Date().toISOString()
   const response=await fetch('/api/weibo',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({id:edit.id,body:edit.body,status:edit.status||'published',published_at:publishedAt})
   })
   const data=await response.json().catch(()=>({}))
   setSaving(false)
   if(!response.ok)return setNotice(data.error||'保存失败')
   setNotice('微博已保存')
   setTimeout(()=>location.reload(),600)
  }catch{
   setSaving(false)
   setNotice('网络异常，请稍后重试。')
  }
 }

 async function remove(id){
  if(!confirm('确定删除这条微博？'))return
  try{
   const response=await fetch('/api/weibo',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({id})})
   const data=await response.json().catch(()=>({}))
   if(!response.ok)return setNotice(data.error||'删除失败')
   setWeibos(prev=>prev.filter(x=>x.id!==id))
   setEdit(makeBlank())
   setNotice('微博已删除')
  }catch{
   setNotice('网络异常，请稍后重试。')
  }
 }

 const totalLikes=weibos.reduce((sum,item)=>sum+(Number(item.likes)||0),0)

 return <main className="studio weibo-studio">
  <header>
   <div>
    <p>EDITORIAL DATA / {weibos.length} 条微博 · {totalLikes} 次点赞</p>
    <h1>微博编辑</h1>
   </div>
   <div><Link href="/weibo">查看微博 ↗</Link></div>
  </header>
  <div className="studio-grid">
   <aside aria-label="选择微博">
    <button type="button" onClick={()=>choose(null)}>＋ 新建微博</button>
    {weibos.map(item=><article key={item.id} role="button" tabIndex={0} aria-pressed={edit.id===item.id} onClick={()=>choose(item)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(item)}}}>
     <small>{formatListTime(item.published_at)}</small>
     <h3>{previewText(item.body)}</h3>
     <div className="post-list-meta"><span>{item.status==='draft'?'draft':'published'}</span><b>♥ {Number(item.likes)||0}</b><span>👁 {Number(item.view_count)||0} · 今日 {Number(item.views_today)||0}</span></div>
    </article>)}
   </aside>
   <form ref={editorRef} className="editor" onSubmit={save}>
    <div className="editor-top">
     <div><span>{edit.id?'编辑微博':'新建微博'}</span>{edit.id&&<b className="editor-view-count">♥ {Number(edit.likes)||0} 次点赞</b>}{edit.id&&<b className="editor-view-count">👁 {Number(edit.view_count)||0} 次浏览 · 今日 {Number(edit.views_today)||0}</b>}</div>
     {edit.id&&<button type="button" onClick={()=>remove(edit.id)}>删除</button>}
    </div>
    <label className="body-label">正文格式</label>
    <MarkdownEditor value={edit.body||''} onChange={body=>setEdit({...edit,body})}/>
    <div className="two">
     <label>状态<select value={edit.status||'published'} onChange={e=>setEdit({...edit,status:e.target.value})}><option value="published">发布</option><option value="draft">草稿</option></select></label>
     <label>发布时间<input type="datetime-local" value={edit.published_at||''} onChange={e=>setEdit({...edit,published_at:e.target.value})}/></label>
    </div>
    <button className="save" disabled={saving}>{saving?'保存中…':'保存微博'}</button>
    <p aria-live="polite">{notice}</p>
   </form>
  </div>
 </main>
}
