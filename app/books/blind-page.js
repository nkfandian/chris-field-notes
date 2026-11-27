'use client'

import {useEffect,useMemo,useState} from 'react'
import Link from 'next/link'

function escapeRegExp(s){
 return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
}

function maskBookClues(review,book){
 let out=String(review||'').trim()
 const mainTitle=String(book?.title||'').split(/[:：（）()]/)[0].trim()
 if(mainTitle.length>=2){
  out=out.replace(new RegExp(`《\\s*${escapeRegExp(mainTitle)}[^》]*》`,'gi'),'「 ░░░ 」')
  out=out.replace(new RegExp(`「\\s*${escapeRegExp(mainTitle)}[^」]*」`,'gi'),'「 ░░░ 」')
  out=out.replace(new RegExp(escapeRegExp(mainTitle),'gi'),' ░░░ ')
 }
 const rawAuthor=String(book?.author||'')
  .replace(/\[[^\]]+\]|（[^）]+）|\([^)]+\)/g,' ')
  .split(/[、,，/]/)[0]
  .trim()
 if(rawAuthor.length>=2){
  out=out.replace(new RegExp(escapeRegExp(rawAuthor),'gi'),'某位作者')
 }
 return out
}

export default function BlindPage({books=[],onLocateBook}){
 const candidates=useMemo(()=>books.filter(b=>{
  if(b.status!=='Read')return false
  const rev=String(b.review||'').trim()
  if(rev.length<36)return false
  if(/marking for|stand-in/i.test(rev))return false
  return true
 }),[books])

 const [deck,setDeck]=useState([])
 const [cursor,setCursor]=useState(0)
 const [revealed,setRevealed]=useState(false)
 const [cardNo,setCardNo]=useState(1)

 useEffect(()=>{
  if(!candidates.length)return
  const indices=candidates.map((_,i)=>i)
  for(let i=indices.length-1;i>0;i--){
   const j=Math.floor(Math.random()*(i+1))
   ;[indices[i],indices[j]]=[indices[j],indices[i]]
  }
  setDeck(indices)
  setCursor(0)
  setRevealed(false)
  setCardNo(1)
 },[candidates])

 if(!candidates.length){
  return <div className="book-empty">正在整理书签盲盒…</div>
 }

 const activeIndex=deck.length?deck[cursor%deck.length]:0
 const current=candidates[activeIndex]||candidates[0]
 const maskedQuote=maskBookClues(current.review,current)
 const readMonth=current.created_at?String(current.created_at).slice(0,7):''

 function nextCard(){
  setRevealed(false)
  setCursor(c=>c+1)
  setCardNo(n=>n+1)
 }

 return <section className="blind-shell" aria-label="盲品一页书">
  <div className="blind-intro">
   <small>BLIND TASTING / 旧书店偶遇</small>
   <p>先隐去书名、封面与作者光环，只读一段当年留下的真实手记。若这段话恰好击中你，再翻开封底看它是哪一本书。</p>
  </div>

  <article className={`blind-card${revealed?' is-revealed':''}`}>
   <header className="blind-card-top">
    <span>BOOKMARK NO. {String(cardNo).padStart(3,'0')}</span>
    <span>{revealed?'封底已揭晓':'书名与作者已隐去'}</span>
   </header>

   {!revealed?(
    <div className="blind-front">
     <div className="blind-quote-mark" aria-hidden="true">“</div>
     <blockquote className="blind-quote">{maskedQuote}</blockquote>
     <div className="blind-clues">
      <span>语言：{current.language==='English'?'英文原版':'中文版'}</span>
      {current.rating>0&&<span>当年私藏评分：{'★'.repeat(current.rating)}</span>}
     </div>
     <div className="blind-actions">
      <button type="button" className="blind-reveal-btn" onClick={()=>setRevealed(true)}>翻开封底 · 揭晓书名 ↻</button>
      <button type="button" className="blind-next-btn" onClick={nextCard}>换一张书签</button>
     </div>
    </div>
   ):(
    <div className="blind-back">
     <div className="blind-book-reveal">
      <div className="blind-cover">
       {current.cover_url?<img src={current.cover_url} alt={`${current.title} 封面`}/>:<span>暂无封面</span>}
      </div>
      <div className="blind-book-info">
       <small>{current.language==='English'?'英文':'中文'} · 已读{readMonth?`于 ${readMonth}`:''} {current.rating>0?`· ${'★'.repeat(current.rating)}`:''}</small>
       <h2>{current.title}</h2>
       {current.author&&<p className="blind-author">{current.author}</p>}
       {(current.custom_lists||[]).filter(c=>c!=='豆瓣导入'&&c!=='历史日志关联').length>0&&(
        <div className="blind-tags">
         {(current.custom_lists||[]).filter(c=>c!=='豆瓣导入'&&c!=='历史日志关联').map(tag=><span key={tag}>{tag}</span>)}
        </div>
       )}
      </div>
     </div>

     <div className="blind-full-review">
      <small>完整原始短评</small>
      <p>{current.review}</p>
     </div>

     <div className="blind-actions is-revealed-bar">
      <button type="button" className="blind-reveal-btn" onClick={nextCard}>再抽一张盲盒书签 ↻</button>
      {onLocateBook&&<button type="button" className="blind-next-btn" onClick={()=>onLocateBook(current.id)}>在书架中定位 →</button>}
      {current.linked_post_slug&&<Link className="blind-post-link" href={`/logs/${encodeURIComponent(current.linked_post_slug)}`}>阅读关联长文 ↗</Link>}
     </div>
    </div>
   )}
  </article>
 </section>
}
