'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {labels} from '@/lib/demo'
import InteractionForm from './components/interaction-form'
import SubscribeForm from './components/subscribe-form'
import Logo from './components/logo'
import './home.css'

const domains = ['decode','execute','deploy','trek','roots']
const domainName = key => labels[key]?.split('/ ')[1] || key
const bookStatus = {Reading:'在读',Read:'已读','To Read':'想读'}

export default function HomeClient({posts,books=[],bookCount=0,trails=[],content={},aboutText,showStudio=false}) {
  const [filter,setFilter] = useState('all')
  const [selected,setSelected] = useState(null)
  const [menu,setMenu] = useState(false)
  const [aboutOpen,setAboutOpen] = useState(false)
  const dialogRef = useRef(null)
  const menuRef = useRef(null)
  const shown = (filter==='all' ? posts : posts.filter(p=>p.domain===filter)).slice(0,6)
  const modalOpen = aboutOpen || Boolean(selected)

  useEffect(() => {
    if (!modalOpen) return
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector('button')?.focus()
    const handleKey = event => {
      if (event.key === 'Escape') { setAboutOpen(false); setSelected(null) }
      if (event.key !== 'Tab') return
      const focusable = [...(dialogRef.current?.querySelectorAll('a[href],button,input,textarea,select,[tabindex="0"]') || [])]
      const first = focusable[0], last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown',handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown',handleKey)
      previousFocus?.focus()
    }
  },[modalOpen])

  useEffect(() => {
    if (!menu) return
    const close = event => {
      if (event.key === 'Escape') { setMenu(false); menuRef.current?.focus() }
    }
    document.addEventListener('keydown',close)
    return () => document.removeEventListener('keydown',close)
  },[menu])

  const legacyHero = !content.hero_title || content.hero_title==='我不展示答案。'
  const heroTitle = legacyHero ? '面对复杂。' : content.hero_title
  const heroEmphasis = legacyHero || content.hero_emphasis==='我记录理解发生的过程。' ? '保持欢喜。' : content.hero_emphasis
  const legacyDeck = !content.hero_deck || content.hero_deck.startsWith('一个实用主义者的公开工作台') || content.hero_deck.startsWith('现实的世界千疮百孔')
  const heroDeck = legacyDeck ? 'The theme of my life is complexity-through-joy.' : content.hero_deck

  return <div className="home-page">
    <a className="home-skip-link" href="#log">跳至最新日志</a>
    <header className={`site-header ${menu?'nav-open':''}`}>
      <a className="wordmark" href="#top" aria-label="CHRIS / FIELD NOTES 首页" onClick={()=>setMenu(false)}><Logo/></a>
      <button ref={menuRef} type="button" className="menu-button" aria-expanded={menu} aria-controls="home-navigation" onClick={()=>setMenu(!menu)}>{menu?'关闭 ×':'菜单'}</button>
      <nav id="home-navigation" aria-label="主导航" onClick={event=>{if(event.target.closest('a'))setMenu(false)}}>
        <a href="#log">日志</a><Link href="/books">书单</Link><Link href="/trails">轨迹</Link><Link href="/search">搜索</Link>
        <button type="button" className="nav-about" onClick={()=>{setAboutOpen(true);setMenu(false)}}>ABOUT</button>
        <a href="#subscribe">订阅</a>{showStudio&&<Link className="admin-entry" href="/studio">STUDIO ↗</Link>}
      </nav>
    </header>
    <main id="top">
      <section className="hero quote-hero" aria-label="首页引语">
        <blockquote className="hero-slogan">
          <h1><span>{heroTitle}</span><em>{heroEmphasis}</em></h1>
          <div className="hero-quote-meta"><p className="hero-deck" lang="en">{heroDeck}</p><div className="hero-attribution"><span aria-hidden="true"/><cite>E. B. White</cite></div></div>
        </blockquote>
      </section>
      <section id="log" className="section home-logs" aria-labelledby="home-logs-title">
        <div className="home-section-heading"><h2 id="home-logs-title">最新日志</h2><Link className="all-logs-link" href={filter==='all'?'/logs':`/logs?domain=${filter}`}>查看全部 <span aria-hidden="true">↗</span></Link></div>
        <div className="filters" role="group" aria-label="筛选日志分类">{['all',...domains].map(key=><button type="button" key={key} className={filter===key?'active':''} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{key==='all'?'全部':domainName(key)}</button>)}</div>
        <div className="home-entry-list">{shown.map((post,index)=><article className="entry" key={post.id}>
          <span className="entry-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span>
          <div className="entry-copy">
            <div className="entry-meta"><small>{domainName(post.domain)}</small>{post.published_at&&<time dateTime={post.published_at}>{post.published_at.slice(0,10).replaceAll('-','.')}</time>}</div>
            <h3><Link href={`/logs/${encodeURIComponent(post.slug)}`}>{post.title}</Link></h3>
            {post.excerpt&&<p>{post.excerpt}</p>}
          </div>
          {(post.thesis||post.tools)&&<button className="entry-details" type="button" aria-label={`查看《${post.title}》的详情`} onClick={()=>setSelected(post)}>详情 <span aria-hidden="true">＋</span></button>}
        </article>)}</div>
        {!shown.length&&<p className="home-empty" role="status">这个分类还没有日志。</p>}
      </section>
      <section id="reading" className="section home-reading" aria-label="书单与阅读轨迹">
        <div className="reading-grid">
          <section className="reading-books" aria-labelledby="home-books-title">
            <header className="reading-panel-head"><div><small>THE SHELF / {bookCount} VOLUMES</small><h2 id="home-books-title">书单</h2></div><p>读过、正在读，以及准备打开的书。每一本都可能成为一篇日志的起点。</p></header>
            <div className="reading-book-list">{books.map((book,index)=><Link className="reading-book" href={`/books#book-${book.id}`} key={book.id}>
              <span className="reading-book-no">{String(index+1).padStart(2,'0')}</span>
              <span className="reading-book-cover">{book.cover_url?<img src={book.cover_url} alt={`${book.title} 封面`} loading="lazy"/>:<span aria-hidden="true">无封面</span>}</span>
              <span className="reading-book-copy"><small>{bookStatus[book.status]||book.status}{book.rating?` · ${'★'.repeat(book.rating)}`:''}</small><strong>{book.title}</strong><em>{book.author}</em></span>
            </Link>)}</div>
            {!books.length&&<p className="reading-empty">书架正在整理。</p>}
            <div className="reading-panel-foot"><span>阅读记录与短评</span><Link href="/books">打开完整书单 <b aria-hidden="true">↗</b></Link></div>
          </section>
          <section className="reading-trails" aria-labelledby="home-trails-title">
            <header className="reading-panel-head"><div><small>CURATED ROUTES / {trails.length} PATHS</small><h2 id="home-trails-title">轨迹</h2></div><p>把文章和书按问题重新连接。不是目录，而是一条可以顺着走下去的阅读路径。</p></header>
            <ol>{trails.map((trail,index)=><li key={trail.id}><Link href={`/trails/${encodeURIComponent(trail.slug)}`}>
              <span className="reading-trail-no">{String(index+1).padStart(2,'0')}</span>
              <span className="reading-trail-copy"><small>{trail.trail_items?.length||0} 个节点</small><strong>{trail.title}</strong>{trail.summary&&<em>{trail.summary}</em>}<span className="reading-trail-dots" aria-hidden="true">{(trail.trail_items||[]).slice(0,10).map(item=><i className={`is-${item.item_type}`} key={item.id}/>)}</span></span>
              <b className="reading-trail-open" aria-hidden="true">↗</b>
            </Link></li>)}</ol>
            {!trails.length&&<p className="reading-empty">路径正在铺设。</p>}
            <div className="reading-panel-foot"><span>主题式阅读路径</span><Link href="/trails">查看全部轨迹 <b aria-hidden="true">↗</b></Link></div>
          </section>
        </div>
      </section>
      <section id="subscribe" className="home-contact" aria-labelledby="home-contact-title">
        <div className="contact-intro"><small>KEEP IN TOUCH</small><h2 id="home-contact-title">偶尔更新，<br/>随时联系。</h2></div>
        <div className="contact-actions">
          <div className="contact-subscribe"><div className="contact-copy"><b>订阅新日志</b><span>只在新内容发布时发送。</span></div><SubscribeForm/></div>
          <details id="message" className="contact-message"><summary><span className="contact-copy"><b>给我留言</b><span>问题、线索，或只是打个招呼。</span></span><i aria-hidden="true">＋</i></summary><InteractionForm kind="message"/></details>
        </div>
      </section>
    </main>
    <footer className="site-footer"><span>CHRIS / FIELD NOTES © 2026</span><div className="footer-meta"><button type="button" onClick={()=>setAboutOpen(true)}>ABOUT</button><Link href="/privacy">隐私政策</Link><a href="#top">返回顶部 ↑</a></div></footer>
    {aboutOpen&&<><button className="about-backdrop" onClick={()=>setAboutOpen(false)} aria-label="关闭 ABOUT" tabIndex={-1}/><section ref={dialogRef} className="about-modal" role="dialog" aria-modal="true" aria-label="ABOUT"><header><button type="button" onClick={()=>setAboutOpen(false)}>关闭 ×</button></header><p>{aboutText}</p></section></>}
    {selected&&<><button className="backdrop" onClick={()=>setSelected(null)} aria-label="关闭日志详情" tabIndex={-1}/><aside ref={dialogRef} className="drawer" role="dialog" aria-modal="true" aria-labelledby="home-detail-title"><button type="button" onClick={()=>setSelected(null)}>关闭 ×</button><h2 id="home-detail-title">日志详情</h2><dl><dt>发布日期</dt><dd>{selected.published_at?.slice(0,10)}</dd>{selected.thesis&&<><dt>核心判断</dt><dd>{selected.thesis}</dd></>}{selected.tools&&<><dt>输入与工具</dt><dd>{selected.tools}</dd></>}</dl></aside></>}
  </div>
}
