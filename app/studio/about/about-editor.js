'use client'

import {useState} from 'react'
import Link from 'next/link'
import {DEFAULT_ABOUT_CONFIG} from '@/lib/about'
import {requestIndexing} from '@/lib/indexnow-client'

export default function AboutEditor({initialConfig}){
 const [config,setConfig]=useState(()=>structuredClone(initialConfig||DEFAULT_ABOUT_CONFIG))
 const [notice,setNotice]=useState('')
 const [saving,setSaving]=useState(false)

 function updateSection(index,patch){
  setConfig(prev=>{
   const sections=prev.sections.map((s,i)=>i===index?{...s,...patch}:s)
   return {...prev,sections}
  })
 }

 function moveSection(index,dir){
  const target=index+dir
  if(target<0||target>=config.sections.length)return
  setConfig(prev=>{
   const sections=[...prev.sections]
   ;[sections[index],sections[target]]=[sections[target],sections[index]]
   return {...prev,sections}
  })
 }

 function addSection(){
  setConfig(prev=>({
   ...prev,
   sections:[
    ...prev.sections,
    {
     id:`sec-${Date.now().toString(36)}`,
     badge:'NEW FEATURE',
     title:'新体验模块标题',
     body:'在这里填写这个功能的体验说明（以 • 开头的行会自动渲染成圆点列表）。',
     actions:[{label:'去体验 →',href:'/',primary:false}]
    }
   ]
  }))
 }

 function removeSection(index){
  if(!confirm('确定删除这个导览板块吗？'))return
  setConfig(prev=>({...prev,sections:prev.sections.filter((_,i)=>i!==index)}))
 }

 function updateAction(secIdx,actIdx,patch){
  setConfig(prev=>{
   const sections=prev.sections.map((sec,i)=>{
    if(i!==secIdx)return sec
    const actions=(sec.actions||[]).map((a,j)=>j===actIdx?{...a,...patch}:a)
    return {...sec,actions}
   })
   return {...prev,sections}
  })
 }

 function addAction(secIdx){
  setConfig(prev=>{
   const sections=prev.sections.map((sec,i)=>i===secIdx?{...sec,actions:[...(sec.actions||[]),{label:'按钮文字 →',href:'/',primary:false}]}:sec)
   return {...prev,sections}
  })
 }

 function removeAction(secIdx,actIdx){
  setConfig(prev=>{
   const sections=prev.sections.map((sec,i)=>i===secIdx?{...sec,actions:(sec.actions||[]).filter((_,j)=>j!==actIdx)}:sec)
   return {...prev,sections}
  })
 }

 function resetDefaults(){
  if(!confirm('确定恢复为系统默认的整套导览文案吗？未保存的修改将被覆盖。'))return
  setConfig(structuredClone(DEFAULT_ABOUT_CONFIG))
  setNotice('已载入默认导览文案，点击底部「保存 ABOUT 页面」即可生效。')
 }

 async function save(event){
  event.preventDefault()
  if(saving)return
  setSaving(true)
  setNotice('')
  try{
   const res=await fetch('/api/studio/about',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify(config)
   })
   const data=await res.json().catch(()=>({}))
   setSaving(false)
   if(!res.ok)return setNotice(data.error||'保存失败')
   setNotice('ABOUT 与导览页已保存并立即生效 ✓')
   await requestIndexing(['/','/about']).catch(()=>{})
  }catch{
   setSaving(false)
   setNotice('网络异常，请稍后重试。')
  }
 }

 return <main className="studio">
  <header>
   <div>
    <p>EDITORIAL GUIDE / 共 {config.sections.length} 个优先级导览卡片</p>
    <h1>ABOUT 与体验导览编辑</h1>
   </div>
   <div>
    <Link href="/about" target="_blank">预览关于页 ↗</Link>
   </div>
  </header>

  <form className="editor" onSubmit={save} style={{maxWidth:'920px'}}>
   <label>
    页面大标题
    <input value={config.headline||''} onChange={e=>setConfig({...config,headline:e.target.value})} required/>
   </label>

   <label>
    开场自述（支持换行分段）
    <textarea className="body" rows={4} value={config.intro||''} onChange={e=>setConfig({...config,intro:e.target.value})} required/>
   </label>

   <label>
    导览区引导语
    <input value={config.guideLead||''} onChange={e=>setConfig({...config,guideLead:e.target.value})}/>
   </label>

   <div style={{margin:'1.8rem 0 .8rem',display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'1px solid var(--line)',paddingTop:'1.4rem'}}>
    <strong style={{font:'600 14px var(--mono)'}}>导览板块（按 01 → 0{config.sections.length} 优先级排列）</strong>
    <div style={{display:'flex',gap:'.6rem'}}>
     <button type="button" onClick={addSection} style={{padding:'.4rem .8rem',font:'12px var(--mono)',cursor:'pointer'}}>＋ 新增板块</button>
     <button type="button" onClick={resetDefaults} style={{padding:'.4rem .8rem',font:'12px var(--mono)',cursor:'pointer'}}>恢复默认文案</button>
    </div>
   </div>

   <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
    {config.sections.map((sec,idx)=><section key={sec.id||idx} style={{border:'1px solid var(--line)',background:'var(--paper-deep)',padding:'1.15rem 1.25rem'}}>
     <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'.75rem',marginBottom:'.8rem'}}>
      <span style={{font:'600 12px var(--mono)',color:'var(--accent)'}}>优先级 {String(idx+1).padStart(2,'0')}</span>
      <div style={{display:'flex',gap:'.4rem'}}>
       <button type="button" disabled={idx===0} onClick={()=>moveSection(idx,-1)} style={{padding:'.25rem .55rem',font:'12px var(--mono)',cursor:'pointer'}}>↑ 上移</button>
       <button type="button" disabled={idx===config.sections.length-1} onClick={()=>moveSection(idx,1)} style={{padding:'.25rem .55rem',font:'12px var(--mono)',cursor:'pointer'}}>↓ 下移</button>
       <button type="button" onClick={()=>removeSection(idx)} style={{padding:'.25rem .55rem',font:'12px var(--mono)',color:'#8b453d',cursor:'pointer'}}>删除</button>
      </div>
     </div>

     <div className="two">
      <label>
       板块标题
       <input value={sec.title||''} onChange={e=>updateSection(idx,{title:e.target.value})}/>
      </label>
      <label>
       右上角英文角标（可选）
       <input value={sec.badge||''} onChange={e=>updateSection(idx,{badge:e.target.value})} placeholder="如 AI DIGITAL TWIN"/>
      </label>
     </div>

     <label>
      介绍正文（以 `• ` 开头的行会自动显示为圆点列表）
      <textarea className="body" rows={5} value={sec.body||''} onChange={e=>updateSection(idx,{body:e.target.value})}/>
     </label>

     <div style={{marginTop:'.6rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'.45rem'}}>
       <span style={{font:'12px var(--mono)',color:'var(--muted)'}}>快捷跳转按钮</span>
       <button type="button" onClick={()=>addAction(idx)} style={{padding:'.2rem .55rem',font:'11px var(--mono)',cursor:'pointer'}}>＋ 添加按钮</button>
      </div>
      {(sec.actions||[]).map((act,aIdx)=><div key={aIdx} style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) auto auto',gap:'.5rem',alignItems:'center',marginBottom:'.45rem'}}>
       <input value={act.label||''} onChange={e=>updateAction(idx,aIdx,{label:e.target.value})} placeholder="按钮文字"/>
       <input value={act.href||''} onChange={e=>updateAction(idx,aIdx,{href:e.target.value})} placeholder="路径，如 /books?tab=rx"/>
       <label style={{display:'inline-flex',alignItems:'center',gap:'4px',margin:0,font:'11px var(--mono)',whiteSpace:'nowrap'}}>
        <input type="checkbox" checked={Boolean(act.primary)} onChange={e=>updateAction(idx,aIdx,{primary:e.target.checked})} style={{width:'auto'}}/>
        主按钮
       </label>
       <button type="button" onClick={()=>removeAction(idx,aIdx)} style={{padding:'.35rem .55rem',font:'11px var(--mono)',cursor:'pointer'}}>×</button>
      </div>)}
     </div>
    </section>)}
   </div>

   <div style={{marginTop:'1.5rem'}}>
    <button className="save" disabled={saving}>{saving?'保存中…':'保存 ABOUT 页面'}</button>
    <p aria-live="polite">{notice}</p>
   </div>
  </form>
 </main>
}
