'use client'
import {useMemo,useState} from 'react'
import Link from 'next/link'
const statusLabel={Reading:'在读',Read:'已读','To Read':'想读'}
export default function BooksClient({initialBooks}){
  const [language,setLanguage]=useState('All'),[status,setStatus]=useState('All'),[list,setList]=useState('All'),[expanded,setExpanded]=useState(()=>new Set())
  const lists=useMemo(()=>[...new Set(initialBooks.flatMap(b=>b.custom_lists||[]))].sort(),[initialBooks])
  const shown=initialBooks.filter(b=>(language==='All'||b.language===language)&&(status==='All'||b.status===status)&&(list==='All'||(b.custom_lists||[]).includes(list)))
  const toggle=id=>setExpanded(current=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next})
  const row=(label,value,setValue,options)=><div className="book-filter" role="group" aria-label={label}><span>{label}</span><div>{options.map(([key,text])=><button type="button" className={value===key?'active':''} aria-pressed={value===key} onClick={()=>setValue(key)} key={key}>{text}</button>)}</div></div>
  return <>
    <section className="book-controls" aria-label="筛选书单">
      {row('语言',language,setLanguage,[['All','全部'],['Chinese','中文'],['English','英文']])}
      {row('状态',status,setStatus,[['All','全部'],['Reading','在读'],['Read','已读'],['To Read','想读']])}
      {lists.length>0&&row('专题',list,setList,[['All','全部'],...lists.map(x=>[x,x])])}
    </section>
    <p className="book-count" aria-live="polite">{shown.length} / {initialBooks.length} 本</p>
    <section className="book-grid">{shown.map(book=>{
      const open=expanded.has(book.id),long=(book.review||'').length>60
      return <article className="book-card" id={`book-${book.id}`} key={book.id}>
        <div className="book-cover">{book.cover_url?<img src={book.cover_url} alt={`${book.title} 封面`} loading="lazy"/>:<span>暂无封面</span>}</div>
        <p className="book-meta"><span>{book.language==='English'?'英文':'中文'} · {statusLabel[book.status]||book.status}</span>{book.rating>0&&<span className="book-rating" aria-label={`评分 ${book.rating} / 5`}>{'★'.repeat(book.rating)}</span>}</p>
        <h2>{book.title}</h2>
        {book.author&&<p className="book-author">{book.author}</p>}
        {book.review&&<div className={`book-review${open?' is-open':''}`}><p>{book.review}</p>{long&&<button type="button" onClick={()=>toggle(book.id)} aria-expanded={open}>{open?'收起':'展开短评'}</button>}</div>}
        {book.linked_post_slug&&<Link className="book-link" href={`/logs/${encodeURIComponent(book.linked_post_slug)}`}>关联日志 →</Link>}
      </article>})}
      {!shown.length&&<div className="book-empty">没有符合条件的书。</div>}
    </section>
  </>
}
