'use client'
import {useMemo,useState} from 'react'
import Link from 'next/link'

const MODE_LABEL={ai:'✦ AI 分身',extractive:'智能摘要',empty:'无匹配'}
const MIGRATION_SQL=`create table if not exists public.ask_logs (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 1 and 500),
  answer text not null default '',
  mode text not null default 'ai' check (mode in ('ai','extractive','empty')),
  ai_status text,
  source_count integer not null default 0 check (source_count >= 0),
  sources jsonb not null default '[]'::jsonb,
  session_hash text,
  created_at timestamptz not null default now()
);
create index if not exists ask_logs_created_idx on public.ask_logs(created_at desc);
alter table public.ask_logs enable row level security;
drop policy if exists "admin manages ask_logs" on public.ask_logs;
create policy "admin manages ask_logs" on public.ask_logs
  for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());`

function fmtDate(iso){
 if(!iso)return ''
 const d=new Date(iso)
 if(Number.isNaN(d.getTime()))return String(iso).slice(0,16)
 return d.toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})
}

export default function AskLogsClient({initial=[],tableMissing=false,errorMessage=''}){
 const [logs,setLogs]=useState(initial)
 const [filter,setFilter]=useState('all')
 const [query,setQuery]=useState('')
 const [notice,setNotice]=useState('')
 const [busyId,setBusyId]=useState('')
 const [copied,setCopied]=useState(false)

 const visible=useMemo(()=>{
  const q=query.trim().toLowerCase()
  return logs.filter(item=>{
   if(filter!=='all'&&item.mode!==filter)return false
   if(!q)return true
   return `${item.question||''} ${item.answer||''}`.toLowerCase().includes(q)
  })
 },[logs,filter,query])

 async function removeLog(id){
  setBusyId(id)
  setNotice('')
  try{
   const res=await fetch('/api/studio/ask',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'delete',id})})
   const data=await res.json().catch(()=>({}))
   if(!res.ok)return setNotice(data.error||'删除失败。')
   setLogs(prev=>prev.filter(x=>x.id!==id))
  }catch{
   setNotice('网络异常，删除失败。')
  }finally{
   setBusyId('')
  }
 }

 async function copySql(){
  try{
   await navigator.clipboard.writeText(MIGRATION_SQL)
   setCopied(true)
   setTimeout(()=>setCopied(false),2000)
  }catch{}
 }

 return <main className="studio">
  <header>
   <div><h1>AI 作者对话记录</h1><p>共 {logs.length} 条访客提问记录（仅管理员可见，不记录明文 IP）。</p></div>
   <div className="studio-actions"><Link href="/search?mode=ask">去前台体验 ↗</Link></div>
  </header>

  {tableMissing&&<section style={{border:'1px solid var(--accent)',background:'var(--paper-deep)',padding:'1.2rem 1.4rem',marginBottom:'1.5rem'}}>
   <p style={{margin:'0 0 .75rem',fontWeight:600}}>Supabase 中尚未创建 <code>ask_logs</code> 数据表</p>
   <p style={{margin:'0 0 .9rem',fontSize:'.92rem',color:'var(--muted)'}}>请在 Supabase SQL Editor 执行一次以下建表 SQL（仓库内已同步保存为 <code>supabase/migrations/20261122_ask_logs.sql</code>），执行后访客提问就会自动记录到这里：</p>
   <pre style={{overflowX:'auto',padding:'.9rem',background:'var(--paper)',border:'1px solid var(--line)',fontSize:'12px',lineHeight:1.5,margin:'0 0 .9rem'}}>{MIGRATION_SQL}</pre>
   <button type="button" onClick={copySql} style={{background:'var(--ink)',color:'var(--paper)',border:0,padding:'.55rem 1rem',font:'12px var(--mono)',cursor:'pointer'}}>{copied?'已复制 SQL ✓':'复制建表 SQL'}</button>
  </section>}

  {errorMessage&&<p className="studio-error" role="status">{errorMessage}</p>}
  {notice&&<p className="studio-error" role="status">{notice}</p>}

  {!tableMissing&&<>
   <div style={{display:'flex',flexWrap:'wrap',gap:'.75rem 1rem',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem'}}>
    <div className="moderation-tabs" role="tablist">
     {[['all','全部',logs.length],['ai','AI 回答',logs.filter(x=>x.mode==='ai').length],['extractive','摘要兜底',logs.filter(x=>x.mode==='extractive').length],['empty','无匹配',logs.filter(x=>x.mode==='empty').length]].map(([k,label,n])=>
      <button key={k} type="button" className={filter===k?'active':''} onClick={()=>setFilter(k)}>{label} ({n})</button>
     )}
    </div>
    <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索提问或回答关键词…" aria-label="搜索对话记录" style={{minWidth:'220px',padding:'.5rem .75rem',border:'1px solid var(--line)',background:'var(--paper)',font:'13px var(--serif)'}}/>
   </div>

   <div className="moderation-list">
    {visible.map(item=>{
     const ans=String(item.answer||'')
     const preview=ans.replace(/\s+/g,' ').trim().slice(0,48)
     return <article key={item.id} className="moderation-card" style={{padding:'.85rem 1rem'}}>
      <div className="moderation-meta">
       <span>{fmtDate(item.created_at)}</span>
       <span>{MODE_LABEL[item.mode]||item.mode}</span>
       {item.source_count>0&&<span>引用 {item.source_count} 条</span>}
       {item.session_hash&&<span title="匿名会话哈希">访客 #{String(item.session_hash).slice(0,6)}</span>}
      </div>
      <h2 style={{margin:'.35rem 0 .45rem',font:'700 1.04rem/1.45 var(--serif)'}}>问：{item.question}</h2>
      <details>
       <summary style={{cursor:'pointer',color:'var(--accent)',fontSize:'12.5px',fontFamily:'var(--mono)',lineHeight:1.5}}>
        展开回答（{ans.length} 字）{preview?` · ${preview}${ans.length>48?'…':''}`:''}
       </summary>
       <div style={{marginTop:'.7rem',whiteSpace:'pre-wrap',font:'.94rem/1.75 var(--serif)',color:'var(--ink)',background:'var(--paper-deep)',padding:'.85rem 1rem',borderLeft:'3px solid var(--accent)'}}>{ans}</div>
       {Array.isArray(item.sources)&&item.sources.length>0&&<details style={{marginTop:'.65rem',fontSize:'12px'}}>
        <summary style={{cursor:'pointer',color:'var(--accent)',fontFamily:'var(--mono)'}}>查看引用出处（{item.sources.length}）</summary>
        <ul style={{margin:'.45rem 0 0',paddingLeft:'1.2rem',color:'var(--muted)',lineHeight:1.7}}>
         {item.sources.map((s,i)=><li key={`${s.url}-${i}`}><Link href={s.url||'#'} target="_blank" style={{color:'inherit',textDecoration:'underline'}}>[{i+1}] {s.title}（{s.date}）</Link></li>)}
        </ul>
       </details>}
       <div className="moderation-actions" style={{marginTop:'.75rem'}}>
        <button type="button" className="danger" disabled={busyId===item.id} onClick={()=>removeLog(item.id)}>{busyId===item.id?'删除中…':'删除记录'}</button>
       </div>
      </details>
     </article>
    })}
    {!visible.length&&<p className="moderation-empty">暂无匹配的 AI 对话记录。</p>}
   </div>
  </>}
 </main>
}
