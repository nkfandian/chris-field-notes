'use client'
import {useState} from 'react'
import Link from 'next/link'
import {createClient} from '@/lib/supabase/client'
import {requestIndexing} from '@/lib/indexnow-client'

export default function AboutEditor({initialText}){
 const [text,setText]=useState(initialText),[notice,setNotice]=useState(''),[saving,setSaving]=useState(false)
 async function save(event){
  event.preventDefault();setSaving(true);setNotice('')
  const {error}=await createClient().from('site_content').upsert({key:'about',value:{text:text.trim()},updated_at:new Date().toISOString()})
  setSaving(false);setNotice(error?.message||'ABOUT 介绍已保存')
  if(!error)await requestIndexing(['/'])
 }
 return <main className="studio"><header><div><h1>ABOUT 编辑</h1></div><div><Link href="/studio">文章编辑</Link>　<Link href="/">查看网站 ↗</Link></div></header><form className="editor" onSubmit={save}><label>弹窗介绍文字<textarea className="body" rows={10} value={text} onChange={event=>setText(event.target.value)}/></label><button className="save" disabled={saving||!text.trim()}>{saving?'保存中…':'保存 ABOUT 介绍'}</button><p aria-live="polite">{notice}</p></form></main>
}
