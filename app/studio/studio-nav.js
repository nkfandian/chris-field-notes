'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {createClient} from '@/lib/supabase/client'

const items=[
 ['/studio','日志'],
 ['/studio/books','书单'],
 ['/studio/trails','轨迹'],
 ['/studio/site','首页内容'],
 ['/studio/about','ABOUT'],
 ['/studio/comments','互动审核'],
 ['/studio/subscribers','订阅用户']
]

export default function StudioNav({hideOnRoot=false,counts={}}){
 const pathname=usePathname()
 const [seen,setSeen]=useState({})
 useEffect(()=>{
  if(pathname==='/studio/comments'||pathname==='/studio/subscribers')setSeen(prev=>prev[pathname]?prev:{...prev,[pathname]:true})
 },[pathname])
 async function signOut(){await createClient().auth.signOut();location.href='/'}
 if(hideOnRoot&&pathname==='/studio')return null
 const badgeFor=href=>{
  if(seen[href]||pathname===href)return null
  const n=href==='/studio/comments'?counts.comments:href==='/studio/subscribers'?counts.subscribers:0
  if(!n)return null
  return <span className="studio-nav-badge" aria-label={`${n} 条新内容`}>{n>99?'99+':n}</span>
 }
 return <nav className="studio-console-nav" aria-label="Studio 控制台导航"><Link className="studio-console-mark" href="/studio">C/ STUDIO</Link><div>{items.map(([href,label])=><Link className={pathname===href?'active':''} aria-current={pathname===href?'page':undefined} href={href} key={href}>{label}{badgeFor(href)}</Link>)}</div><button type="button" onClick={signOut}>退出</button></nav>
}
