'use client'
import {useState} from 'react'
import Link from 'next/link'

export default function ConfirmClient({token}){
 const [state,setState]=useState(token?'ready':'invalid')
 async function confirm(){
  setState('working')
  try{const response=await fetch('/api/subscribe/confirm',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})});setState(response.ok?'done':'invalid')}catch{setState('invalid')}
 }
 return <main className="studio login"><h1>{state==='done'?'订阅已确认':state==='invalid'?'确认链接无效':'确认订阅'}</h1><p className="auth-notice">{state==='done'?'订阅成功。':state==='invalid'?'链接无效或已处理。':'请确认订阅。'}</p>{state==='ready'&&<button className="return-link" onClick={confirm}>确认订阅</button>}{state==='working'&&<p className="auth-notice">正在确认…</p>}<Link className="return-link" href="/">返回网站</Link></main>
}
