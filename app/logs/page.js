import Link from 'next/link'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {demoPosts,labels} from '@/lib/demo'
import './index.css'

export const revalidate=60
const domains=['all','decode','execute','deploy','trek','roots']

export default async function LogsPage({searchParams}){
  const requested=(await searchParams)?.domain||'all'
  const domain=domains.includes(requested)?requested:'all'
  let posts=demoPosts
  if(isConfigured()){
    const db=await createClient()
    let query=db.from('posts').select('*').eq('status','published').order('published_at',{ascending:false})
    if(domain!=='all')query=query.eq('domain',domain)
    const {data}=await query
    posts=data||[]
  }else if(domain!=='all')posts=posts.filter(post=>post.domain===domain)
  return <main className="logs-index"><nav><Link href="/">← 返回首页</Link><Link href="/">C/ FIELD NOTES</Link></nav><header><small>COMPLETE ARCHIVE / {String(posts.length).padStart(3,'0')}</small><h1>{domain==='all'?'全部日志':labels[domain]}</h1><p>按时间倒序保存理解发生的过程。</p></header><div className="logs-filters">{domains.map(item=><Link className={item===domain?'active':''} href={item==='all'?'/logs':`/logs?domain=${item}`} key={item}>{item==='all'?'全部':labels[item].split('/ ')[1]}</Link>)}</div><section>{posts.map((post,index)=><Link className="log-index-entry" href={`/logs/${encodeURIComponent(post.slug)}`} key={post.id}><span>{String(index+1).padStart(3,'0')}</span><div><small>{labels[post.domain]||post.domain}</small><h2>{post.title}</h2><p>{post.excerpt}</p></div><time>{post.published_at?.slice(0,10)}</time></Link>)}</section></main>
}
