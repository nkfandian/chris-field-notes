import Link from 'next/link'
import Logo from '../components/logo'
import {createClient,isConfigured} from '@/lib/supabase/server'
import './trails.css'
export const revalidate=60
export const metadata={title:'轨迹',description:'将日志与书籍组织为可循迹阅读的路径。'}
export default async function TrailsPage(){let trails=[];if(isConfigured()){const db=await createClient();const {data}=await db.from('trails').select('id,slug,title,summary,updated_at,trail_items(id)').eq('status','published').order('updated_at',{ascending:false});trails=data||[]}return <main className="trails-page"><nav><Link href="/"><Logo compact/></Link><span>CURATED PATHS / 阅读轨迹</span><Link href="/search">搜索 ↗</Link></nav><header><small>CONNECTIONS, NOT COLLECTIONS</small><h1>不是更多内容，<br/><em>而是一条可走的路。</em></h1><p>轨迹把分散的日志、书与短注重新排列。每一条路径都从一个问题出发，而不是从分类开始。</p></header><section className="trail-index">{trails.map((t,i)=><Link href={`/trails/${encodeURIComponent(t.slug)}`} key={t.id}><span>{String(i+1).padStart(2,'0')}</span><div><small>{String(t.trail_items?.length||0).padStart(2,'0')} STOPS</small><h2>{t.title}</h2><p>{t.summary}</p></div><b>循迹阅读 →</b></Link>)}{!trails.length&&<p className="trail-empty">第一条轨迹正在整理中。</p>}</section></main>}
