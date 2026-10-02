'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import Logo from './logo'
import AboutModal,{AboutLink} from './about-modal'
import './site-chrome.css'

const links=[['logs','/logs','日志'],['books','/books','书单'],['trails','/trails','轨迹'],['search','/search','搜索']]

// 所有公开页面共用的顶部导航；current 标记当前栏目。
export default function SiteHeader({current,showStudio=false}){
  const [open,setOpen]=useState(false)
  const buttonRef=useRef(null)
  useEffect(()=>{
    if(!open)return
    const close=event=>{if(event.key==='Escape'){setOpen(false);buttonRef.current?.focus()}}
    document.addEventListener('keydown',close)
    return()=>document.removeEventListener('keydown',close)
  },[open])
  return <><header className={`sc-header${open?' is-open':''}`}>
    <a className="sc-skip" href="#content">跳至正文</a>
    <Link className="sc-brand" href="/" aria-label="CHRIS / FIELD NOTES 首页" onClick={()=>setOpen(false)}><Logo/></Link>
    <button ref={buttonRef} type="button" className="sc-menu" aria-expanded={open} aria-controls="site-navigation" onClick={()=>setOpen(!open)}>{open?'关闭 ×':'菜单'}</button>
    <nav id="site-navigation" aria-label="主导航" onClick={event=>{if(event.target.closest('a'))setOpen(false)}}>
      {links.map(([key,href,label])=><Link key={key} href={href} aria-current={current===key?'page':undefined}>{label}</Link>)}
      <AboutLink onOpen={()=>setOpen(false)}/>
      <a href="#subscribe">订阅</a>
      {/* 用整页跳转进入后台，避免公开页已加载的广告和统计脚本留在后台页面 */}
      {showStudio&&<a className="sc-studio" href="/studio">STUDIO ↗</a>}
    </nav>
  </header><AboutModal/></>
}
