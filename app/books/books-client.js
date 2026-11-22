'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import Link from 'next/link'

const PAGE_SIZE=10
const statusLabel={Reading:'在读',Read:'已读','To Read':'想读'}
const formatMonth=iso=>iso?String(iso).slice(0,7):''

function buildPageList(current,total){
  if(total<=7)return Array.from({length:total},(_,i)=>i+1)
  const pages=[1]
  if(current>3)pages.push('...')
  for(let p=Math.max(2,current-1);p<=Math.min(total-1,current+1);p++)pages.push(p)
  if(current<total-2)pages.push('...')
  pages.push(total)
  return pages
}

export default function BooksClient({initialBooks}){
  const topRef=useRef(null)
  const [language,setLanguage]=useState('All')
  const [status,setStatus]=useState('Read')
  const [list,setList]=useState('All')
  const [page,setPage]=useState(1)
  const [expanded,setExpanded]=useState(()=>new Set())

  useEffect(()=>{
    const sp=new URLSearchParams(window.location.search)
    const qList=sp.get('list'),qStatus=sp.get('status'),qLang=sp.get('language')
    if(qList){setList(qList);if(!qStatus)setStatus('All')}
    if(qStatus)setStatus(qStatus)
    if(qLang)setLanguage(qLang)
    const hashMatch=window.location.hash.match(/^#book-(.+)$/)
    if(hashMatch){
      const targetId=decodeURIComponent(hashMatch[1])
      const target=initialBooks.find(b=>String(b.id)===targetId)
      if(target){
        const nextStatus=qStatus||target.status||'All'
        const nextLang=qLang||'All'
        const nextList=qList||'All'
        setLanguage(nextLang)
        setStatus(nextStatus)
        setList(nextList)
        const filtered=initialBooks.filter(b=>(nextLang==='All'||b.language===nextLang)&&(nextStatus==='All'||b.status===nextStatus)&&(nextList==='All'||(b.custom_lists||[]).includes(nextList)))
        const idx=filtered.findIndex(b=>String(b.id)===targetId)
        if(idx>=0){
          setPage(Math.floor(idx/PAGE_SIZE)+1)
          setExpanded(prev=>{const next=new Set(prev);next.add(target.id);return next})
          setTimeout(()=>document.getElementById(`book-${target.id}`)?.scrollIntoView({behavior:'smooth',block:'center'}),120)
        }
      }
    }
  },[initialBooks])

  const lists=useMemo(()=>[...new Set(initialBooks.flatMap(b=>b.custom_lists||[]))].sort(),[initialBooks])
  const shown=useMemo(()=>initialBooks.filter(b=>(language==='All'||b.language===language)&&(status==='All'||b.status===status)&&(list==='All'||(b.custom_lists||[]).includes(list))),[initialBooks,language,status,list])

  const totalPages=Math.max(1,Math.ceil(shown.length/PAGE_SIZE))
  const currentPage=Math.min(page,totalPages)
  const paged=shown.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE)
  const pageList=buildPageList(currentPage,totalPages)

  const toggle=id=>setExpanded(current=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next})
  const changeFilter=(setter,val)=>{setter(val);setPage(1)}
  const goPage=next=>{
    const p=Math.max(1,Math.min(totalPages,next))
    setPage(p)
    topRef.current?.scrollIntoView({behavior:'smooth',block:'start'})
  }

  const row=(label,value,setter,options)=><div className="book-filter" role="group" aria-label={label}><span>{label}</span><div>{options.map(([key,text])=><button type="button" className={value===key?'active':''} aria-pressed={value===key} onClick={()=>changeFilter(setter,key)} key={key}>{text}</button>)}</div></div>

  return <>
    <section className="book-controls" ref={topRef} aria-label="筛选书单">
      {row('语言',language,setLanguage,[['All','全部'],['Chinese','中文'],['English','英文']])}
      {row('状态',status,setStatus,[['Read','已读'],['Reading','在读'],['To Read','想读'],['All','全部']])}
      {lists.length>0&&row('专题',list,setList,[['All','全部'],...lists.map(x=>[x,x])])}
    </section>
    <p className="book-count" aria-live="polite">第 {currentPage} / {totalPages} 页 · 共 {shown.length} / {initialBooks.length} 本</p>
    <section className="book-grid">{paged.map(book=>{
      const open=expanded.has(book.id),long=(book.review||'').length>60,month=formatMonth(book.created_at)
      return <article className="book-card" id={`book-${book.id}`} key={book.id}>
        <div className="book-cover">{book.cover_url?<img src={book.cover_url} alt={`${book.title} 封面`} loading="lazy"/>:<span>暂无封面</span>}</div>
        <p className="book-meta"><span>{book.language==='English'?'英文':'中文'} · {statusLabel[book.status]||book.status}{month?` · ${month}`:''}</span>{book.rating>0&&<span className="book-rating" aria-label={`评分 ${book.rating} / 5`}>{'★'.repeat(book.rating)}</span>}</p>
        <h2>{book.title}</h2>
        {book.author&&<p className="book-author">{book.author}</p>}
        {book.review&&<div className={`book-review${open?' is-open':''}`}><p>{book.review}</p>{long&&<button type="button" onClick={()=>toggle(book.id)} aria-expanded={open}>{open?'收起':'展开短评'}</button>}</div>}
        {book.linked_post_slug&&<Link className="book-link" href={`/logs/${encodeURIComponent(book.linked_post_slug)}`}>关联日志 →</Link>}
      </article>})}
      {!paged.length&&<div className="book-empty">没有符合条件的书。</div>}
    </section>
    {totalPages>1&&<nav className="books-pagination" aria-label="书单分页">
      <button type="button" className="page-step" disabled={currentPage<=1} onClick={()=>goPage(currentPage-1)}>← 上一页</button>
      <div className="page-numbers">{pageList.map((item,idx)=>item==='...'?<span className="page-ellipsis" key={`e-${idx}`}>…</span>:<button type="button" key={item} className={item===currentPage?'active':''} aria-current={item===currentPage?'page':undefined} onClick={()=>goPage(item)}>{item}</button>)}</div>
      <button type="button" className="page-step" disabled={currentPage>=totalPages} onClick={()=>goPage(currentPage+1)}>下一页 →</button>
    </nav>}
  </>
}
