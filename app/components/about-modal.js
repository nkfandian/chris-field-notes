'use client'
import {useEffect,useRef,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import {DEFAULT_ABOUT_TEXT,resolveAboutText} from '@/lib/about'

const OPEN_EVENT='field-notes:about'

// 导航和页脚里的“关于”：打开弹窗；无 JS 时仍可进入 /about。
export function AboutLink({children='关于',onOpen}){
  return <a href="/about" onClick={event=>{event.preventDefault();onOpen?.();window.dispatchEvent(new Event(OPEN_EVENT))}}>{children}</a>
}

// 弹窗只显示一段介绍文字；内容来自后台“ABOUT 文本”，加载前先显示默认文字。
export default function AboutModal(){
  const [open,setOpen]=useState(false)
  const [text,setText]=useState(DEFAULT_ABOUT_TEXT)
  const loaded=useRef(false)
  const dialogRef=useRef(null)

  useEffect(()=>{
    const show=()=>setOpen(true)
    window.addEventListener(OPEN_EVENT,show)
    return()=>window.removeEventListener(OPEN_EVENT,show)
  },[])

  useEffect(()=>{
    if(!open)return
    if(!loaded.current&&process.env.NEXT_PUBLIC_SUPABASE_URL){
      loaded.current=true
      createClient().from('site_content').select('key,value').in('key',['about','home']).then(({data})=>{
        const rows=Object.fromEntries((data||[]).map(row=>[row.key,row.value||{}]))
        setText(resolveAboutText(rows.about||{},rows.home||{}))
      },()=>{})
    }
    const previousFocus=document.activeElement
    const previousOverflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    dialogRef.current?.querySelector('button')?.focus()
    const handleKey=event=>{
      if(event.key==='Escape')setOpen(false)
      if(event.key==='Tab'){event.preventDefault();dialogRef.current?.querySelector('button')?.focus()}
    }
    document.addEventListener('keydown',handleKey)
    return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',handleKey);previousFocus?.focus?.()}
  },[open])

  if(!open)return null
  return <>
    <button className="sc-about-backdrop" type="button" onClick={()=>setOpen(false)} aria-label="关闭介绍" tabIndex={-1}/>
    <section ref={dialogRef} className="sc-about" role="dialog" aria-modal="true" aria-label="关于">
      <header><button type="button" onClick={()=>setOpen(false)}>关闭 ×</button></header>
      <p>{text}</p>
    </section>
  </>
}
