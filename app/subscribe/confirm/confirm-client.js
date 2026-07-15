'use client'
import {useState} from 'react'
import Link from 'next/link'

export default function ConfirmClient({token}){
 const [state,setState]=useState(token?'ready':'invalid')
 async function confirm(){
  setState('working')
  try{const response=await fetch('/api/subscribe/confirm',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})});setState(response.ok?'done':'invalid')}catch{setState('invalid')}
 }
 return <main className="studio login"><p className="studio-mark">C/ SUBSCRIPTION</p><h1>{state==='done'?'订阅已确认':state==='invalid'?'确认链接无效':'确认你的订阅'}</h1><p className="auth-notice">{state==='done'?'下一篇日志完成时，它会抵达你的邮箱。':state==='invalid'?'链接可能已经失效，或订阅已经被处理。':'点击下方按钮完成最后一步。邮件安全扫描器不会替你自动确认。'}</p>{state==='ready'&&<button className="return-link" onClick={confirm}>确认订阅 →</button>}{state==='working'&&<p className="auth-notice">正在确认…</p>}<Link className="return-link" href="/">返回网站 →</Link></main>
}
