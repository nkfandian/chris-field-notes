import Link from 'next/link'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {demoPosts,labels} from '@/lib/demo'
import SiteHeader from '../components/site-header'
import SiteFooter from '../components/site-footer'
import StructuredData from '../components/structured-data'
import {SITE_LANGUAGE,SITE_URL,WEBSITE_ID,pageMetadata} from '@/lib/seo'
import './index.css'

export const revalidate=60
const domains=['all','decode','execute','deploy','trek','roots']
const domainSeo={
  all:{title:'日志',description:'按时间浏览关于阅读、教育、商业、人工智能、技术实践与个人经验的中文原创日志。'},
  decode:{title:'解码：语言、教育与社会观察',description:'从语言、教育和社会现象出发，拆解习以为常的叙事，记录判断如何形成。'},
  execute:{title:'执行：商业、产品与行动',description:'关于商业、产品、组织与现实行动的观察，关注想法如何进入具体世界。'},
  deploy:{title:'部署：人工智能与技术实践',description:'记录人工智能、软件工具与个人工作流的真实使用经验、方法和反思。'},
  trek:{title:'跋涉：行走与身体经验',description:'关于行走、户外与身体经验的日志，让现实中的移动重新校准判断。'},
  roots:{title:'溯源：历史、传统与个人记忆',description:'从家族、地方、历史与个人记忆出发，理解那些仍在影响当下的来路。'}
}

export async function generateMetadata({searchParams}){
  const requested=(await searchParams)?.domain||'all'
  const domain=domains.includes(requested)?requested:'all'
  const meta=domainSeo[domain]
  const path=domain==='all'?'/logs':`/logs?domain=${domain}`
  return pageMetadata({title:meta.title,description:meta.description,path,keywords:[labels[domain]?.split('/ ')[1]||'日志','日志索引']})
}

export default async function LogsPage({searchParams}){
  const requested=(await searchParams)?.domain||'all'
  const domain=domains.includes(requested)?requested:'all'
  const meta=domainSeo[domain]
  let posts=demoPosts
  if(isConfigured()){
    const db=await createClient()
    let query=db.from('posts').select('id,slug,title,excerpt,domain,published_at').eq('status','published').order('published_at',{ascending:false})
    if(domain!=='all')query=query.eq('domain',domain)
    const {data}=await query
    posts=data||[]
  }else if(domain!=='all')posts=posts.filter(post=>post.domain===domain)
  const path=domain==='all'?'/logs':`/logs?domain=${domain}`,url=`${SITE_URL}${path}`
  const schema={'@context':'https://schema.org','@graph':[{'@type':'CollectionPage','@id':url,url,name:meta.title,description:meta.description,inLanguage:SITE_LANGUAGE,isPartOf:{'@id':WEBSITE_ID},mainEntity:{'@type':'ItemList',numberOfItems:posts.length,itemListElement:posts.map((post,index)=>({'@type':'ListItem',position:index+1,url:`${SITE_URL}/logs/${encodeURIComponent(post.slug)}`,name:post.title,description:post.excerpt}))}},{'@type':'BreadcrumbList','@id':`${url}#breadcrumb`,itemListElement:[{'@type':'ListItem',position:1,name:'首页',item:SITE_URL},{'@type':'ListItem',position:2,name:domain==='all'?'日志':meta.title,item:url}]}]}
  return <><SiteHeader current="logs"/><main className="logs-index" id="content"><StructuredData data={schema}/><header><div><h1>{domain==='all'?'日志':labels[domain].split('/ ')[1]}</h1><p>{meta.description}</p></div><span>{posts.length} 篇</span></header><div className="logs-filters" aria-label="日志栏目">{domains.map(item=><Link className={item===domain?'active':''} aria-current={item===domain?'page':undefined} href={item==='all'?'/logs':`/logs?domain=${item}`} key={item}>{item==='all'?'全部':labels[item].split('/ ')[1]}</Link>)}</div><section>{posts.map((post,index)=><Link className="log-index-entry" href={`/logs/${encodeURIComponent(post.slug)}`} key={post.id}><span>{String(index+1).padStart(2,'0')}</span><div><small>{labels[post.domain]?.split('/ ')[1]||post.domain}</small><h2>{post.title}</h2><p>{post.excerpt}</p></div><time dateTime={post.published_at}>{post.published_at?.slice(0,10)}</time></Link>)}</section></main><SiteFooter/></>
}
