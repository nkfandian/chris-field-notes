'use client'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {createClient} from '@/lib/supabase/client'

const items=[
 ['/studio','日志'],
 ['/studio/books','书单'],
 ['/studio/trails','轨迹'],
 ['/studio/site','网站内容'],
 ['/studio/comments','互动审核'],
 ['/studio/subscribers','订阅用户']
]

export default function StudioNav({hideOnRoot=false}){
 const pathname=usePathname()
 async function signOut(){await createClient().auth.signOut();location.href='/'}
 if(hideOnRoot&&pathname==='/studio')return null
 return <nav className="studio-console-nav" aria-label="Studio 控制台导航"><Link className="studio-console-mark" href="/studio">C/ STUDIO</Link><div>{items.map(([href,label])=><Link className={pathname===href?'active':''} aria-current={pathname===href?'page':undefined} href={href} key={href}>{label}</Link>)}</div><button type="button" onClick={signOut}>退出</button></nav>
}
