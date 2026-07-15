import Link from 'next/link'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {demoPosts,labels} from '@/lib/demo'
import Logo from '../components/logo'
import StructuredData from '../components/structured-data'
import {SITE_LANGUAGE,SITE_URL,pageMetadata} from '@/lib/seo'
import './index.css'

export const revalidate=60
const domains=['all','decode','execute','deploy','trek','roots']

export async function generateMetadata({searchParams}){
  const requested=(await searchParams)?.domain||'all'
  const domain=domains.includes(requested)?requested:'all'
  const name=domain==='all'?'全部日志':labels[domain].split('/ ')[1]
  const path=domain==='all'?'/logs':`/logs?domain=${domain}`
  return pageMetadata({title:name,description:domain==='all'?'按时间倒序浏览关于语言、商业、技术、阅读与行动的全部日志。':`浏览“${name}”栏目下的文章与思考记录。`,path,keywords:[name,'日志索引']})
}

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
  const schema={'@context':'https://schema.org','@type':'CollectionPage',name:domain==='all'?'全部日志':labels[domain],url:`${SITE_URL}${domain==='all'?'/logs':`/logs?domain=${domain}`}`,inLanguage:SITE_LANGUAGE,mainEntity:{'@type':'ItemList',numberOfItems:posts.length,itemListElement:posts.map((post,index)=>({'@type':'ListItem',position:index+1,url:`${SITE_URL}/logs/${encodeURIComponent(post.slug)}`,name:post.title}))}}
  return <main className="logs-index"><StructuredData data={schema}/><nav><Link href="/">← 返回首页</Link><Link href="/" aria-label="CHRIS / FIELD NOTES 首页"><Logo compact/></Link></nav><header><small>COMPLETE ARCHIVE / {String(posts.length).padStart(3,'0')}</small><h1>{domain==='all'?'全部日志':labels[domain]}</h1><p>按时间倒序保存理解发生的过程。</p></header><div className="logs-filters">{domains.map(item=><Link className={item===domain?'active':''} href={item==='all'?'/logs':`/logs?domain=${item}`} key={item}>{item==='all'?'全部':labels[item].split('/ ')[1]}</Link>)}</div><section>{posts.map((post,index)=><Link className="log-index-entry" href={`/logs/${encodeURIComponent(post.slug)}`} key={post.id}><span>{String(index+1).padStart(3,'0')}</span><div><small>{labels[post.domain]||post.domain}</small><h2>{post.title}</h2><p>{post.excerpt}</p></div><time>{post.published_at?.slice(0,10)}</time></Link>)}</section></main>
}
