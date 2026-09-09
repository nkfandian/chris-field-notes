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

export default function HomeClient({posts,content={},aboutText,showStudio=false}) {
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
      <section id="domains" className="section home-domains" aria-labelledby="home-domains-title">
        <div className="home-section-heading"><h2 id="home-domains-title">日志分类</h2></div>
        <div className="domain-grid">{domains.map(key=><Link className="domain-card" key={key} href={`/logs?domain=${key}`}><h3>{domainName(key)}</h3><div><span>{posts.filter(post=>post.domain===key).length} 篇</span><span className="domain-arrow" aria-hidden="true">↗</span></div></Link>)}</div>
      </section>
      <section id="subscribe" className="section subscribe-section" aria-labelledby="home-subscribe-title">
        <div className="home-section-heading"><h2 id="home-subscribe-title">订阅更新</h2></div><div className="subscribe-grid"><SubscribeForm/></div>
      </section>
      <section id="message" className="section message-section" aria-labelledby="home-message-title">
        <div className="home-section-heading"><h2 id="home-message-title">留言</h2></div><div className="message-grid"><InteractionForm kind="message"/></div>
      </section>
    </main>
    <footer className="site-footer"><span>CHRIS / FIELD NOTES © 2026</span><div className="footer-meta"><button type="button" onClick={()=>setAboutOpen(true)}>ABOUT</button><Link href="/privacy">隐私政策</Link><a href="#top">返回顶部 ↑</a></div></footer>
    {aboutOpen&&<><button className="about-backdrop" onClick={()=>setAboutOpen(false)} aria-label="关闭 ABOUT" tabIndex={-1}/><section ref={dialogRef} className="about-modal" role="dialog" aria-modal="true" aria-label="ABOUT"><header><button type="button" onClick={()=>setAboutOpen(false)}>关闭 ×</button></header><p>{aboutText}</p></section></>}
    {selected&&<><button className="backdrop" onClick={()=>setSelected(null)} aria-label="关闭日志详情" tabIndex={-1}/><aside ref={dialogRef} className="drawer" role="dialog" aria-modal="true" aria-labelledby="home-detail-title"><button type="button" onClick={()=>setSelected(null)}>关闭 ×</button><h2 id="home-detail-title">日志详情</h2><dl><dt>发布日期</dt><dd>{selected.published_at?.slice(0,10)}</dd>{selected.thesis&&<><dt>核心判断</dt><dd>{selected.thesis}</dd></>}{selected.tools&&<><dt>输入与工具</dt><dd>{selected.tools}</dd></>}</dl></aside></>}
  </div>
}
