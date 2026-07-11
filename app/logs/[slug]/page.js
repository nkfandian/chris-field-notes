import Link from 'next/link'
import {notFound} from 'next/navigation'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {demoPosts,labels} from '@/lib/demo'
import './log.css'
export const revalidate=60
export default async function LogPage({params}){const raw=(await params).slug;let slug=raw;try{slug=decodeURIComponent(raw)}catch{}let post=demoPosts.find(p=>p.slug===slug);if(isConfigured()){const db=await createClient();const {data}=await db.from('posts').select('*').eq('slug',slug).eq('status','published').maybeSingle();post=data||post}if(!post)notFound();return <main className="log-page"><nav><Link href="/#log">← 返回日志索引</Link><Link href="/">C/ FIELD NOTES</Link></nav><article><header><small>{labels[post.domain]||post.domain}</small><h1>{post.title}</h1><p>{post.excerpt}</p><time>{post.published_at}</time></header><div className="log-body">{(post.body||post.excerpt).split('\n').map((x,i)=>x?<p key={i}>{x}</p>:<br key={i}/>)}</div><aside><b>核心判断</b><p>{post.thesis}</p><b>输入与工具</b><p>{post.tools}</p></aside></article></main>}
