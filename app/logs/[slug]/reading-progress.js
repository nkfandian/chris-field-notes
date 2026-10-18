'use client'
import {useEffect,useState} from 'react'

// 长文顶部 2px 阅读进度线（靛蓝），按正文区域计算。
export default function ReadingProgress(){
  const [progress,setProgress]=useState(0)
  useEffect(()=>{
    const body=document.querySelector('.log-body')
    if(!body)return
    let frame=0
    const update=()=>{
      frame=0
      const rect=body.getBoundingClientRect()
      const total=rect.height-window.innerHeight*0.6
      setProgress(total>0?Math.min(1,Math.max(0,-rect.top/total)):1)
    }
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)}
    update()
    window.addEventListener('scroll',schedule,{passive:true})
    window.addEventListener('resize',schedule)
    return()=>{window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);if(frame)cancelAnimationFrame(frame)}
  },[])
  return <div className="reading-progress" aria-hidden="true"><span style={{transform:`scaleX(${progress})`}}/></div>
}
