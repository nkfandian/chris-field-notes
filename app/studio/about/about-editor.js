'use client'
import {useState} from 'react'
import Link from 'next/link'
import {createClient} from '@/lib/supabase/client'
import {requestIndexing} from '@/lib/indexnow-client'

const fields=[
 ['title','页面标题',2],
 ['lead','开场导语',4],
 ['statement','核心引语',5],
 ['body','介绍正文',14]
]

export default function AboutEditor({initial}){
 const [value,setValue]=useState(initial),[notice,setNotice]=useState(''),[saving,setSaving]=useState(false)
 async function save(event){
  event.preventDefault();setSaving(true);setNotice('')
  const {error}=await createClient().from('site_content').upsert({key:'about',value,updated_at:new Date().toISOString()})
  setSaving(false);setNotice(error?.message||'ABOUT 页面已保存')
  if(!error)await requestIndexing(['/about'])
 }
 return <main className="studio"><header><div><p>C/ STUDIO · ABOUT</p><h1>ABOUT 编辑</h1></div><div><Link href="/studio">文章编辑</Link>　<Link href="/about">查看 ABOUT ↗</Link></div></header><form className="editor" onSubmit={save}>{fields.map(([key,label,rows])=><label key={key}>{label}<textarea className={key==='body'?'body':undefined} rows={rows} value={value[key]||''} onChange={event=>setValue({...value,[key]:event.target.value})}/></label>)}<button className="save" disabled={saving}>{saving?'保存中…':'保存 ABOUT 页面'}</button><p aria-live="polite">{notice}</p></form></main>
}
