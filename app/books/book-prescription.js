'use client'

import {useEffect,useState} from 'react'
import Link from 'next/link'
import qrcode from 'qrcode-generator'

const C={paper:'#f4f0e7',deep:'#ebe4d5',card:'#faf7f0',ink:'#27231e',muted:'#71695f',accent:'#3f718c',line:'#d2c8b8'}
const SERIF="'Noto Serif SC','Songti SC','STSong',Georgia,serif"
const MONO="'IBM Plex Mono',Menlo,Consolas,monospace"

const SAMPLE_PROMPTS=[
 '我喜欢《万历十五年》和《叫魂》，偏爱微观历史',
 '最近工作很倦怠，想找回内心的秩序感',
 '偏爱何伟、欧逸文这类扎实的一手纪实',
 '喜欢 E·B·怀特和汪曾祺，想读点平淡有味的随笔',
 '想理解中国近现代转型的复杂逻辑，有什么必读书？',
 '对物理学史和科学家的真实人生特别着迷',
 '刚毕业进入社会，感觉理想和现实落差很大',
 '想开始读英文原版非虚构，推荐好读又深刻的作品',
 '喜欢《红楼梦》和托尔斯泰，想读后劲大的经典小说',
 '对基层社会与普通人的命运很关注'
]

function pickSamples(n=4){
 const arr=[...SAMPLE_PROMPTS]
 for(let i=arr.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1))
  ;[arr[i],arr[j]]=[arr[j],arr[i]]
 }
 return arr.slice(0,n)
}

function wrapLines(ctx,text,maxWidth){
 const lines=[]
 for(const rawLine of String(text||'').split('\n')){
  const trimmed=rawLine.trim()
  if(!trimmed){lines.push('');continue}
  let cur=''
  for(const ch of trimmed){
   const next=cur+ch
   if(ctx.measureText(next).width>maxWidth&&cur){
    lines.push(cur)
    cur=ch
   }else{
    cur=next
   }
  }
  if(cur)lines.push(cur)
 }
 return lines
}

export default function BookPrescription({readCount=0,onLocateBook}){
 const [input,setInput]=useState('')
 const [samples,setSamples]=useState(()=>SAMPLE_PROMPTS.slice(0,4))
 const [loading,setLoading]=useState(false)
 const [exporting,setExporting]=useState(false)
 const [error,setError]=useState('')
 const [rx,setRx]=useState(null)

 useEffect(()=>{setSamples(pickSamples(4))},[])

 async function generate(raw){
  if(loading)return
  const text=String(raw??input).trim()
  if(text.length<2)return setError('请先写下一两本你喜欢的书，或一句近期的困惑。')
  setError('')
  setInput(text)
  setLoading(true)
  try{
   const res=await fetch('/api/book-rx',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({input:text})
   })
   const data=await res.json().catch(()=>({}))
   setLoading(false)
   if(!res.ok)return setError(data.error||'暂时无法开具书方，请稍后再试。')
   setRx(data)
  }catch{
   setLoading(false)
   setError('网络异常，请稍后再试。')
  }
 }

 async function exportImage(){
  if(!rx||exporting)return
  setExporting(true)
  try{
   if(document.fonts?.ready)await document.fonts.ready
   const width=900,pad=58,contentW=width-pad*2
   const mCanvas=document.createElement('canvas')
   const mctx=mCanvas.getContext('2d')

   mctx.font=`400 24px ${SERIF}`
   const tasteLines=wrapLines(mctx,rx.tasteNote,contentW-32).slice(0,4)
   const bookBlocks=(rx.books||[]).map((b,idx)=>{
    mctx.font=`700 28px ${SERIF}`
    const titleLines=wrapLines(mctx,`${String(idx+1).padStart(2,'0')}. 《${b.title}》`,contentW-36).slice(0,2)
    mctx.font=`400 22px ${SERIF}`
    const reasonLines=wrapLines(mctx,`开方理由：${b.reason}`,contentW-36).slice(0,3)
    const revText=b.review?`Chris 短评：“${b.review.slice(0,95)}${b.review.length>95?'…':''}”`:''
    mctx.font=`400 21px ${SERIF}`
    const revLines=revText?wrapLines(mctx,revText,contentW-36).slice(0,3):[]
    const blockH=28+titleLines.length*40+34+reasonLines.length*34+(revLines.length?revLines.length*33+10:0)+26
    return {b,titleLines,reasonLines,revLines,blockH}
   })
   mctx.font=`400 22px ${SERIF}`
   const noteLines=wrapLines(mctx,rx.rxNote,contentW).slice(0,2)

   const totalBooksH=bookBlocks.reduce((s,x)=>s+x.blockH+18,0)
   const height=230+(tasteLines.length*38+54)+totalBooksH+(noteLines.length*34+40)+145

   const canvas=document.createElement('canvas')
   canvas.width=width
   canvas.height=height
   const ctx=canvas.getContext('2d')

   ctx.fillStyle=C.paper
   ctx.fillRect(0,0,width,height)
   ctx.strokeStyle=C.line
   ctx.lineWidth=2
   ctx.strokeRect(18,18,width-36,height-36)
   ctx.lineWidth=1
   ctx.strokeRect(25,25,width-50,height-50)

   // Header
   ctx.fillStyle=C.accent
   ctx.font=`600 18px ${MONO}`
   ctx.fillText(`CHRIS / READING PRESCRIPTION · ${rx.serial}`,pad,74)

   ctx.fillStyle=C.ink
   ctx.font=`700 44px ${SERIF}`
   ctx.fillText('私人书方签',pad,132)

   ctx.fillStyle=C.muted
   ctx.font=`400 20px ${SERIF}`
   const promptShort=rx.input.length>28?`${rx.input.slice(0,28)}…`:rx.input
   ctx.fillText(`来访引子：${promptShort}`,pad,174)

   // Resonance stamp on top-right
   const stampW=156,stampH=88,stampX=width-pad-stampW,stampY=74
   ctx.strokeStyle=C.accent
   ctx.lineWidth=2
   ctx.strokeRect(stampX,stampY,stampW,stampH)
   ctx.fillStyle='rgba(63,113,140,0.08)'
   ctx.fillRect(stampX,stampY,stampW,stampH)
   ctx.fillStyle=C.accent
   ctx.font=`600 15px ${MONO}`
   ctx.fillText('阅读同频度',stampX+32,stampY+30)
   ctx.font=`700 36px ${MONO}`
   ctx.fillText(`${rx.resonance}%`,stampX+38,stampY+72)

   let y=204
   ctx.strokeStyle=C.line
   ctx.lineWidth=1
   ctx.beginPath()
   ctx.moveTo(pad,y)
   ctx.lineTo(width-pad,y)
   ctx.stroke()

   // Taste collision box
   y+=24
   const tasteBoxH=tasteLines.length*38+30
   ctx.fillStyle=C.deep
   ctx.fillRect(pad,y,contentW,tasteBoxH)
   ctx.fillStyle=C.accent
   ctx.fillRect(pad,y,4,tasteBoxH)
   ctx.fillStyle=C.ink
   ctx.font=`400 24px ${SERIF}`
   let ty=y+36
   for(const ln of tasteLines){
    ctx.fillText(ln,pad+20,ty)
    ty+=38
   }
   y+=tasteBoxH+26

   // 3 Prescribed Books
   for(const blk of bookBlocks){
    ctx.fillStyle=C.card
    ctx.fillRect(pad,y,contentW,blk.blockH)
    ctx.strokeStyle=C.line
    ctx.strokeRect(pad,y,contentW,blk.blockH)

    let by=y+38
    ctx.fillStyle=C.ink
    ctx.font=`700 28px ${SERIF}`
    for(const ln of blk.titleLines){
     ctx.fillText(ln,pad+20,by)
     by+=40
    }
    ctx.fillStyle=C.accent
    ctx.font=`500 18px ${MONO}`
    const meta=`${blk.b.author||'作者未详'}  ·  Chris 评分 ${'★'.repeat(blk.b.rating||5)}`
    ctx.fillText(meta,pad+20,by-4)
    by+=30

    ctx.fillStyle=C.ink
    ctx.font=`400 22px ${SERIF}`
    for(const ln of blk.reasonLines){
     ctx.fillText(ln,pad+20,by)
     by+=34
    }
    if(blk.revLines.length){
     by+=6
     ctx.fillStyle=C.muted
     ctx.font=`400 21px ${SERIF}`
     for(const ln of blk.revLines){
      ctx.fillText(ln,pad+20,by)
      by+=33
     }
    }
    y+=blk.blockH+18
   }

   // Closing note
   y+=14
   ctx.fillStyle=C.muted
   ctx.font=`400 22px ${SERIF}`
   for(const ln of noteLines){
    ctx.fillText(`※ ${ln}`,pad,y)
    y+=34
   }

   // Footer + QR
   const footY=height-122
   ctx.strokeStyle=C.line
   ctx.beginPath()
   ctx.moveTo(pad,footY)
   ctx.lineTo(width-pad,footY)
   ctx.stroke()

   const qr=qrcode(0,'M')
   qr.addData('https://www.chrisreading.ink/books?tab=rx')
   qr.make()
   const count=qr.getModuleCount()
   const qrSize=74,cell=qrSize/count
   const qrX=width-pad-qrSize,qrY=footY+20
   ctx.fillStyle=C.ink
   for(let r=0;r<count;r++){
    for(let c=0;c<count;c++){
     if(qr.isDark(r,c))ctx.fillRect(qrX+c*cell,qrY+r*cell,Math.ceil(cell),Math.ceil(cell))
    }
   }

   ctx.fillStyle=C.ink
   ctx.font=`600 20px ${MONO}`
   ctx.fillText('CHRISREADING.INK / 私人书方签',pad,footY+48)
   ctx.fillStyle=C.muted
   ctx.font=`400 18px ${SERIF}`
   ctx.fillText('扫码对撞阅读品味，开一张属于你的私人书方',pad,footY+80)

   const link=document.createElement('a')
   link.download=`chris-book-rx-${rx.serial.toLowerCase()}.png`
   link.href=canvas.toDataURL('image/png')
   link.click()
  }finally{
   setExporting(false)
  }
 }

 return <section className="rx-shell" aria-label="私人书方签与品味对撞">
  <div className="rx-composer">
   <div className="rx-composer-head">
    <small>READING PRESCRIPTION / 品味对撞机</small>
    <h2>告诉我你爱读的书，或当下的困惑</h2>
    <p>拿你的阅读偏好与我书架上的 {readCount||'约 600'} 本已读书目及书评做一次对撞，为你开出 3 本高分私藏书方。</p>
   </div>
   <form className="rx-form" onSubmit={e=>{e.preventDefault();generate(input)}}>
    <input
     value={input}
     onChange={e=>setInput(e.target.value)}
     maxLength={160}
     placeholder="例如：喜欢《万历十五年》和何伟，或最近对职业方向有点迷茫…"
     aria-label="输入喜欢的书或近期困惑"
    />
    <button type="submit" disabled={loading}>{loading?'正在翻书架对撞…':'✦ 开具书方'}</button>
   </form>
   <div className="rx-samples" aria-label="灵感示例">
    {samples.map(s=><button type="button" key={s} disabled={loading} onClick={()=>generate(s)}>✦ {s}</button>)}
    <button type="button" className="rx-refresh" disabled={loading} onClick={()=>setSamples(pickSamples(4))}>↻ 换一批</button>
   </div>
   {error&&<p className="rx-error" role="status">{error}</p>}
  </div>

  {rx&&<article className="rx-slip" aria-live="polite">
   <header className="rx-slip-head">
    <div>
     <small>CHRIS / FIELD NOTES · {rx.serial} · {rx.date}</small>
     <h3>私人阅读处方签</h3>
     <p className="rx-trigger">来访引子：「{rx.input}」</p>
    </div>
    <div className="rx-stamp" aria-label={`阅读同频度 ${rx.resonance}%`}>
     <span>阅读同频度</span>
     <strong>{rx.resonance}%</strong>
    </div>
   </header>

   <blockquote className="rx-taste-note">
    <small>品味对撞</small>
    <p>{rx.tasteNote}</p>
   </blockquote>

   <ol className="rx-book-list">
    {rx.books.map((b,idx)=><li key={b.id} className="rx-book-item">
     <div className="rx-book-cover">
      {b.cover_url?<img src={b.cover_url} alt={`${b.title} 封面`} loading="lazy"/>:<span>BOOK</span>}
     </div>
     <div className="rx-book-body">
      <div className="rx-book-meta">
       <span>处方 0{idx+1}</span>
       <span>{b.readMonth?`Chris 读于 ${b.readMonth}`:'已读'} · {'★'.repeat(b.rating||5)}</span>
      </div>
      <h4>{b.title}</h4>
      {b.author&&<p className="rx-book-author">{b.author}</p>}
      <p className="rx-book-reason">{b.reason}</p>
      {b.review&&<div className="rx-book-quote">
       <small>Chris 当年短评</small>
       <p>“{b.review}{b.review.length>=218?'…':''}”</p>
      </div>}
      <div className="rx-book-links">
       {onLocateBook&&<button type="button" onClick={()=>onLocateBook(b.id)}>去书架查看本书 →</button>}
       {b.linked_post_slug&&<Link href={`/logs/${encodeURIComponent(b.linked_post_slug)}`}>阅读关联长文 ↗</Link>}
      </div>
     </div>
    </li>)}
   </ol>

   <footer className="rx-slip-foot">
    <p>※ {rx.rxNote}</p>
    <div className="rx-slip-actions">
     <button type="button" className="rx-export-btn" onClick={exportImage} disabled={exporting}>
      {exporting?'正在生成卡片…':'保存书方签卡片图 ↓'}
     </button>
    </div>
   </footer>
  </article>}
 </section>
}
