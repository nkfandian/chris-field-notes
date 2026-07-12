'use client'
import {useState} from 'react'
import Link from 'next/link'
import {createClient} from '@/lib/supabase/client'
const fields=[['hero_title','首页主标题'],['hero_emphasis','首页强调句'],['hero_deck','首页简介'],['connection_title','跨领域连接标题'],['connection_body','跨领域连接说明'],['manifesto','系统说明']]
export default function SiteEditor({initial}){const [value,setValue]=useState(initial),[notice,setNotice]=useState('');async function save(e){e.preventDefault();const {error}=await createClient().from('site_content').upsert({key:'home',value,updated_at:new Date().toISOString()});setNotice(error?.message||'网站内容已保存')}return <main className="studio"><header><div><p>C/ STUDIO · SITE</p><h1>网站内容</h1></div><div><Link href="/studio">文章编辑</Link>　<Link href="/studio/comments">互动审核</Link>　<Link href="/">查看网站 ↗</Link></div></header><form className="editor" onSubmit={save}>{fields.map(([key,label])=><label key={key}>{label}<textarea rows={key==='manifesto'?5:3} value={value[key]||''} onChange={e=>setValue({...value,[key]:e.target.value})}/></label>)}<button className="save">保存网站内容</button><p>{notice}</p></form></main>}
