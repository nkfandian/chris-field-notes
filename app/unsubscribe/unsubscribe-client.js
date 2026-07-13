'use client'
import {useState} from 'react'
import Link from 'next/link'
export default function UnsubscribeClient({token}){const [notice,setNotice]=useState('确认后将不再收到新日志邮件。'),[done,setDone]=useState(false);async function submit(){const response=await fetch('/api/unsubscribe',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})}),data=await response.json();if(response.ok&&data.ok){setDone(true);setNotice('已取消订阅。')}else setNotice('链接无效或暂时无法退订。')}return <main className="studio login"><p className="studio-mark">C/ SUBSCRIPTION</p><h1>管理订阅</h1><p className="auth-notice">{notice}</p>{!done&&<button onClick={submit} disabled={!token}>确认退订</button>}<Link className="return-link" href="/">返回网站 →</Link></main>}
