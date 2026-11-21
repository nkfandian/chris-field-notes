'use client'

import {useEffect,useState} from 'react'
import PostBody from '@/app/logs/[slug]/post-body'
import InteractionForm from './interaction-form'
import '@/app/weibo/weibo.css'

const LIKE_STORAGE_KEY='field-notes:weibo-likes'

function formatWeiboDate(value){
 if(!value)return ''
 const d=new Date(value)
 if(Number.isNaN(d.getTime()))return String(value)
 const parts=new Intl.DateTimeFormat('zh-CN',{
  timeZone:'Asia/Shanghai',
  year:'numeric',
  month:'2-digit',
  day:'2-digit',
  hour:'2-digit',
  minute:'2-digit',
  hour12:false
 }).formatToParts(d)
 const map=Object.fromEntries(parts.map(p=>[p.type,p.value]))
 return `${map.year}.${map.month}.${map.day} ${map.hour}:${map.minute}`
}

function collapsedSummary(raw=''){
 const source=String(raw||'')
 const hasImage=/!\[[^\]]*\]\((https?:\/\/[^)\s]+)|<img[^>]+src=|https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|avif)/i.test(source)
 const text=source
  .replace(/!\[[^\]]*\]\([^)]*\)/g,' [图片] ')
  .replace(/<img[^>]*>/gi,' [图片] ')
  .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
  .replace(/^:::(?:center(?:-bold)?)\s*$/gm,' ')
  .replace(/^:::\s*$/gm,' ')
  .replace(/[`#>*_~]/g,' ')
  .replace(/\s+/g,' ')
  .trim()
 const lineCount=source.trim().split(/\n+/).length
 return {text,hasImage,lineCount}
}

export default function WeiboFeed({items=[],compact=false}){
 const [likedMap,setLikedMap]=useState({})
 const [likeCounts,setLikeCounts]=useState(()=>Object.fromEntries(items.map(x=>[x.id,Number(x.likes)||0])))
 const [openComments,setOpenComments]=useState({})
 const [expandedBody,setExpandedBody]=useState({})

 useEffect(()=>{
  try{
   const saved=JSON.parse(localStorage.getItem(LIKE_STORAGE_KEY)||'{}')
   if(saved&&typeof saved==='object')setLikedMap(saved)
  }catch{}
 },[])

 useEffect(()=>{
  const syncHash=()=>{
   const raw=location.hash.replace(/^#/,'')
   if(!raw)return
   const match=items.find(x=>x.slug===raw||`weibo-${x.id}`===raw)
   if(match)setOpenComments(prev=>({...prev,[match.id]:true}))
  }
  syncHash()
  window.addEventListener('hashchange',syncHash)
  return()=>window.removeEventListener('hashchange',syncHash)
 },[items])

 async function handleLike(id){
  if(likedMap[id])return
  const nextLiked={...likedMap,[id]:true}
  setLikedMap(nextLiked)
  setLikeCounts(prev=>({...prev,[id]:(Number(prev[id])||0)+1}))
  try{localStorage.setItem(LIKE_STORAGE_KEY,JSON.stringify(nextLiked))}catch{}
  try{
   const res=await fetch('/api/weibo/like',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id})})
   const data=await res.json().catch(()=>({}))
   if(res.ok&&typeof data.likes==='number')setLikeCounts(prev=>({...prev,[id]:data.likes}))
  }catch{}
 }

 function toggleComments(id){
  setOpenComments(prev=>({...prev,[id]:!prev[id]}))
 }

 function toggleBody(id){
  setExpandedBody(prev=>({...prev,[id]:!prev[id]}))
 }

 if(!items.length)return null

 return <div className={`weibo-list${compact?' is-compact':''}`}>
  {items.map((item,index)=>{
   const liked=Boolean(likedMap[item.id])
   const likes=likeCounts[item.id]??(Number(item.likes)||0)
   const topComments=item.comments||[]
   const replies=item.replies||{}
   const commentCount=item.comment_count??topComments.length
   const isOpen=Boolean(openComments[item.id])
   const {text:summaryText,hasImage,lineCount}=collapsedSummary(item.body)
   const foldable=compact&&(summaryText.length>46||lineCount>2||hasImage)
   const bodyExpanded=!foldable||Boolean(expandedBody[item.id])
   return <article className="weibo-entry" id={item.slug} key={item.id}>
    <span className="weibo-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span>
    <div className="weibo-main">
     <div className="weibo-meta">
      <time dateTime={item.published_at}>{formatWeiboDate(item.published_at)}</time>
      <div className="weibo-actions">
       <button type="button" className={`weibo-action${liked?' is-active':''}`} aria-pressed={liked} aria-label={`点赞 ${likes}`} onClick={()=>handleLike(item.id)}>
        <span aria-hidden="true">{liked?'♥':'♡'}</span>
        <span>{likes}</span>
       </button>
       <button type="button" className={`weibo-action${isOpen?' is-active':''}`} aria-expanded={isOpen} onClick={()=>toggleComments(item.id)}>
        <span>评论</span>
        <span>{commentCount}</span>
       </button>
      </div>
     </div>
     <div className={`weibo-body${bodyExpanded?' is-expanded':' is-collapsed'}`}>
      {bodyExpanded?<PostBody body={item.body}/>:<p className="weibo-collapsed-text" onClick={()=>toggleBody(item.id)}>{summaryText}</p>}
      {foldable&&<button type="button" className="weibo-toggle" aria-expanded={bodyExpanded} onClick={()=>toggleBody(item.id)}>{bodyExpanded?'收起 ↑':'展开全文 ↓'}</button>}
     </div>
     {isOpen&&<div className="weibo-comments">
      {topComments.length>0?<div className="comment-list">
       {topComments.map(comment=><article className="comment" key={comment.id}>
        <header><b>{comment.name}</b><time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleDateString('zh-CN')}</time></header>
        <p>{comment.body}</p>
        {replies[comment.id]?.length>0&&<div className="comment-replies">
         {replies[comment.id].map(reply=><article className="comment-reply" key={reply.id}>
          <header><b>Chris · 站长回复</b><time dateTime={reply.created_at}>{new Date(reply.created_at).toLocaleDateString('zh-CN')}</time></header>
          <p>{reply.body}</p>
         </article>)}
        </div>}
       </article>)}
      </div>:<p className="comment-empty">还没有人留下评论。</p>}
      <InteractionForm kind="comment" postSlug={item.slug}/>
     </div>}
    </div>
   </article>
  })}
 </div>
}
