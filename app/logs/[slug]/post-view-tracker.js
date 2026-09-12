'use client'

import {useEffect} from 'react'

const VIEW_WINDOW=30*60*1000

export default function PostViewTracker({slug}){
 useEffect(()=>{
  if(!slug)return
  const key=`field-notes:view:${slug}`
  const now=Date.now()
  let previous=0
  try{previous=Number(localStorage.getItem(key)||0)}catch{}
  if(previous&&now-previous<VIEW_WINDOW)return
  const controller=new AbortController()
  const timer=window.setTimeout(async()=>{
   try{localStorage.setItem(key,String(now))}catch{}
   try{
    const response=await fetch('/api/views',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug}),keepalive:true,signal:controller.signal})
    if(!response.ok)throw new Error('view request failed')
   }catch{
    try{if(Number(localStorage.getItem(key))===now)localStorage.removeItem(key)}catch{}
   }
  },800)
  return()=>{window.clearTimeout(timer);controller.abort()}
 },[slug])
 return null
}
