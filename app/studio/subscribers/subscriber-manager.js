'use client'
import {useMemo,useRef,useState} from 'react'
import Link from 'next/link'
import {createClient} from '@/lib/supabase/client'

const isActive=row=>row.status==='active'&&Boolean(row.verified_at)
const statusLabel={sent:'已发送',partial:'部分失败',failed:'发送失败',sending:'发送中',preparing:'准备中'}

export default function SubscriberManager({initial,history}){
  const [rows,setRows]=useState(initial),[query,setQuery]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
  const campaignRef=useRef(null)
  const shown=useMemo(()=>rows.filter(x=>x.email.toLowerCase().includes(query.toLowerCase())),[rows,query])
  // 只允许停用；恢复订阅必须由邮箱主人点击确认链接。
  async function deactivate(row){if(!confirm(`确定停止向 ${row.email} 发送邮件？恢复订阅需要对方在邮箱中确认。`))return;const {error}=await createClient().from('subscribers').update({status:'unsubscribed',updated_at:new Date().toISOString()}).eq('id',row.id);if(error)return setNotice(error.message);setRows(v=>v.map(x=>x.id===row.id?{...x,status:'unsubscribed'}:x))}
  async function runCampaign(payload){
   for(let page=0;page<1000;page++){
    const response=await fetch('/api/campaigns',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)})
    const data=await response.json().catch(()=>({}))
    if(!response.ok)throw new Error(data.error||'发送失败，可稍后继续。')
    if(data.retryCutoff)payload.retryCutoff=data.retryCutoff
    setNotice(`发送进度：成功 ${data.sent}/${data.total}，失败 ${data.failed}，待处理 ${data.pending}${data.skipped?`，已退订跳过 ${data.skipped}`:''}`)
    if(!data.ready)return data
   }
   throw new Error('本次处理量较大，请稍后用同一任务继续。')
  }
  async function send(e){
   e.preventDefault();if(busy)return
   const formEl=e.currentTarget,form=new FormData(formEl),subject=String(form.get('subject')||''),body=String(form.get('body')||'')
   if(!confirm('确认向全部有效订阅用户发送这封邮件？此操作不能撤回。'))return
   if(!campaignRef.current||campaignRef.current.subject!==subject||campaignRef.current.body!==body)campaignRef.current={id:crypto.randomUUID(),subject,body}
   setBusy(true);setNotice('正在发送…')
   try{
    const task=campaignRef.current
    const data=await runCampaign({campaignId:task.id,subject,body,...(['partial','failed'].includes(task.lastStatus)?{retryCutoff:new Date().toISOString()}:{})})
    task.lastStatus=data.status
    if(data.status==='sent'){campaignRef.current=null;formEl.reset();setTimeout(()=>window.location.reload(),600)}
    else if(data.status==='sending')setNotice('仍有投递在处理中；请稍后保持内容不变，再次点击继续。')
   }catch(error){setNotice(`${error.message||'网络中断'}；请保持内容不变并再次点击继续。`)}
   finally{setBusy(false)}
  }
  async function retryCampaign(item){
   if(busy||!confirm(`继续处理「${item.title}」中未成功的收件人？`))return
   setBusy(true);setNotice('正在重试未完成的投递…')
   try{
    const data=await runCampaign({campaignId:item.campaignId,retryCutoff:new Date().toISOString()})
    setNotice(`重试完成：成功 ${data.sent}，失败 ${data.failed}，待处理 ${data.pending}`)
    setTimeout(()=>window.location.reload(),900)
   }catch(error){setNotice(error.message||'网络中断，请稍后重试。')}
   finally{setBusy(false)}
  }
  return <main className="studio subscribers-admin"><header><div><h1>订阅用户</h1></div><div><Link href="/studio">日志编辑</Link>　<Link href="/">查看网站 ↗</Link></div></header><section className="audience-stats"><div><strong>{rows.filter(isActive).length}</strong><span>有效订阅</span></div><div><strong>{rows.length}</strong><span>全部用户</span></div><div><strong>{history.length}</strong><span>最近推送</span></div></section><div className="subscriber-layout"><section><div className="list-toolbar"><h2>用户列表</h2><input placeholder="搜索邮箱" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="subscriber-list">{shown.map(row=><article key={row.id}><div><strong>{row.email}</strong><small>{row.source||'website'} · {new Date(row.created_at).toLocaleDateString('zh-CN')}</small></div>{row.status==='unsubscribed'?<span className="subscriber-state">已退订</span>:<button onClick={()=>deactivate(row)} title="停用该订阅">{isActive(row)?'有效':'待生效'} · 停用</button>}</article>)}</div></section><section className="campaign-panel"><h2>手动推送</h2><form onSubmit={send}><label>邮件主题<input name="subject" required maxLength="120"/></label><label>正文<textarea name="body" rows="12" required/></label><button className="save" disabled={busy}>{busy?'发送中…':'群发邮件'}</button></form><p className="campaign-notice" role="status">{notice}</p><h3>最近推送</h3>{history.length?history.map(item=><div className="campaign-row" key={item.id}><strong>{item.title}</strong><small>{item.type==='automatic'?'新日志自动推送':'手动群发'} · {statusLabel[item.status]||item.status} · {item.type==='automatic'?`成功 ${item.sent}/${item.total}`:`${item.total} 人`} · {new Date(item.created_at).toLocaleString('zh-CN')}</small>{item.type==='manual'&&item.tracked&&item.status!=='sent'&&<button type="button" className="campaign-retry" disabled={busy} onClick={()=>retryCampaign(item)}>重试未完成投递</button>}</div>):<p>尚无推送记录</p>}</section></div></main>
}
