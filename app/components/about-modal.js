'use client'
import Link from 'next/link'

// 导航和页脚里的“关于”直接进入独立精装导览页 /about。
export function AboutLink({children='关于',onOpen,current}){
 return <Link href="/about" aria-current={current==='about'?'page':undefined} onClick={()=>onOpen?.()}>{children}</Link>
}

export default function AboutModal(){
 return null
}
