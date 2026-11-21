'use client'

import {useState} from 'react'
import qrcode from 'qrcode-generator'

const C={paper:'#f4f0e7',deep:'#e9e1d4',ink:'#27231e',muted:'#71695f',accent:'#3f718c',line:'#d2c8b8'}
const SERIF="'Noto Serif SC','Songti SC','STSong',Georgia,serif"
const MONO="'IBM Plex Mono',Menlo,Consolas,monospace"

function wrapLines(ctx,text,maxWidth){
 const lines=[]
 for(const rawLine of String(text||'').split('\n')){
  const trimmed=rawLine.trim()
  if(!trimmed){lines.push('');continue}
  let current=''
  for(const ch of trimmed){
   const next=current+ch
   if(ctx.measureText(next).width>maxWidth&&current){
    lines.push(current)
    current=ch
   }else{
    current=next
   }
  }
  if(current)lines.push(current)
 }
 return lines
}

export default function WeiboCardExporter({body,publishedAt,slug}){
 const [busy,setBusy]=useState(false)

 async function exportCard(){
  if(busy||!String(body||'').trim())return
  setBusy(true)
  try{
   if(document.fonts?.ready)await document.fonts.ready
   const clean=String(body||'')
    .replace(/!\[[^\]]*\]\([^)]*\)/g,'[图片]')
    .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
    .replace(/[`#>*_~]/g,'')
    .trim()
   const width=900,pad=64,maxTextW=width-pad*2
   const measureCanvas=document.createElement('canvas')
   const mctx=measureCanvas.getContext('2d')
   mctx.font=`400 32px ${SERIF}`
   const lines=wrapLines(mctx,clean,maxTextW).slice(0,18)
   const lineH=54
   const bodyH=lines.length*lineH
   const height=Math.max(500,150+bodyH+150)

   const canvas=document.createElement('canvas')
   canvas.width=width
   canvas.height=height
   const ctx=canvas.getContext('2d')

   ctx.fillStyle=C.paper
   ctx.fillRect(0,0,width,height)
   ctx.strokeStyle=C.line
   ctx.lineWidth=2
   ctx.strokeRect(18,18,width-36,height-36)

   // Header
   ctx.fillStyle=C.accent
   ctx.font=`500 18px ${MONO}`
   ctx.fillText('CHRIS / FIELD NOTES · 微博',pad,72)
   ctx.fillStyle=C.muted
   ctx.font=`400 18px ${MONO}`
   const dateText=(publishedAt||'').replace('T',' ').slice(0,16)
   const dw=ctx.measureText(dateText).width
   ctx.fillText(dateText,width-pad-dw,72)

   ctx.strokeStyle=C.line
   ctx.lineWidth=1
   ctx.beginPath()
   ctx.moveTo(pad,96)
   ctx.lineTo(width-pad,96)
   ctx.stroke()

   // Body
   ctx.fillStyle=C.ink
   ctx.font=`400 32px ${SERIF}`
   let y=156
   for(const ln of lines){
    if(ln)ctx.fillText(ln,pad,y)
    y+=lineH
   }

   // Footer + QR
   const footY=height-110
   ctx.strokeStyle=C.line
   ctx.beginPath()
   ctx.moveTo(pad,footY)
   ctx.lineTo(width-pad,footY)
   ctx.stroke()

   const targetUrl=`https://www.chrisreading.ink/weibo${slug?`#${encodeURIComponent(slug)}`:''}`
   const qr=qrcode(0,'M')
   qr.addData(targetUrl)
   qr.make()
   const count=qr.getModuleCount()
   const qrSize=64
   const cell=qrSize/count
   const qrX=width-pad-qrSize
   const qrY=footY+22
   ctx.fillStyle=C.ink
   for(let r=0;r<count;r++){
    for(let c=0;c<count;c++){
     if(qr.isDark(r,c))ctx.fillRect(qrX+c*cell,qrY+r*cell,Math.ceil(cell),Math.ceil(cell))
    }
   }

   ctx.fillStyle=C.muted
   ctx.font=`400 18px ${MONO}`
   ctx.fillText('CHRISREADING.INK / WEIBO',pad,footY+60)

   const link=document.createElement('a')
   link.download=`weibo-card-${(publishedAt||'').slice(0,10)||'note'}.png`
   link.href=canvas.toDataURL('image/png')
   link.click()
  }finally{
   setBusy(false)
  }
 }

 return <button type="button" className="text-button" onClick={exportCard} disabled={busy||!String(body||'').trim()} style={{marginLeft:'1rem',padding:'.9rem 1.2rem',border:'1px solid var(--line)',background:'transparent',color:'var(--accent)',font:'11px var(--mono)',cursor:'pointer'}}>{busy?'生成中…':'导出卡片图'}</button>
}
