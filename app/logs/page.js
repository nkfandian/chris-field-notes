import Link from 'next/link'
import {createPublicClient,isConfigured} from '@/lib/supabase/server'
import {demoPosts,labels} from '@/lib/demo'
import SiteHeader from '../components/site-header'
import SiteFooter from '../components/site-footer'
import StructuredData from '../components/structured-data'
import {SITE_LANGUAGE,SITE_URL,WEBSITE_ID,pageMetadata} from '@/lib/seo'
import './index.css'

export const revalidate=60
const domains=['all','decode','execute','deploy','trek','roots']
const domainSeo={
  all:{title:'日志',description:'全部原创日志：书评与读书笔记、教育与社会观察、个人记忆，以及 AI 与建站实践，按发布时间排列。'},
  decode:{title:'解码：书评与社会观察',description:'中英文书评与读书笔记，以及对东亚教育、高考、科研评价的观察。涉及何伟、秦晖、杨振宁、乔布斯、马斯克等人物与作品。'},
  execute:{title:'执行：AI 工具实测',description:'用 Codex、Muse、Claude Code 等 AI 工具实际完成任务的记录与比较：哪些活适合交给 AI，哪些还得靠专业工具。'},
  deploy:{title:'部署：用 AI 搭建个人网站',description:'零基础用 Gemini、Codex、Claude Code 搭建和迭代个人网站的全过程，以及自学 Python 的方法。'},
  trek:{title:'跋涉：身边的普通人',description:'记录身边普通人的生活轨迹：走出村庄的人、小镇上的生意、常去超市里消失的熟悉面孔。'},
  roots:{title:'溯源：南开往事与家族记忆',description:'南开求学六年的日记与回忆、家族长辈的往事、从谷歌地球找回的老家，以及年度书信。'}
}

export async function generateMetadata({searchParams}){
  const sp=await searchParams
  const requested=sp?.domain||'all'
  const domain=domains.includes(requested)?requested:'all'
  const meta=domainSeo[domain]
  const path=domain==='all'?'/logs':`/logs?domain=${domain}`
  return pageMetadata({title:meta.title,description:meta.description,path,keywords:[labels[domain]?.split('/ ')[1]||'日志','日志索引']})
}

const PAGE_SIZE=10
const pageTokens=(current,total)=>{
  if(total<=7)return Array.from({length:total},(_,i)=>i+1)
  const pages=new Set([1,2,current-1,current,current+1,total-1,total].filter(n=>n>=1&&n<=total))
  const sorted=[...pages].sort((a,b)=>a-b),out=[]
  for(const n of sorted){if(out.length&&n-out.at(-1)>1)out.push('…');out.push(n)}
  return out
}

export default async function LogsPage({searchParams}){
  const sp=await searchParams
  const requested=sp?.domain||'all'
  const domain=domains.includes(requested)?requested:'all'
  const requestedYear=String(sp?.year||'all')
  const meta=domainSeo[domain]
  let allPosts=demoPosts
  if(isConfigured()){
    const db=createPublicClient()
    let query=db.from('posts').select('id,slug,title,excerpt,domain,published_at').eq('status','published').order('published_at',{ascending:false})
    if(domain!=='all')query=query.eq('domain',domain)
    const {data}=await query
    allPosts=data||[]
  }else if(domain!=='all')allPosts=allPosts.filter(post=>post.domain===domain)
  const years=[...new Set(allPosts.map(p=>String(p.published_at||'').slice(0,4)).filter(y=>/^\d{4}$/.test(y)))].sort((a,b)=>b.localeCompare(a))
  const year=years.includes(requestedYear)?requestedYear:'all'
  const filtered=year==='all'?allPosts:allPosts.filter(p=>String(p.published_at||'').startsWith(year))
  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE))
  const page=Math.min(totalPages,Math.max(1,Number.parseInt(sp?.page||'1',10)||1))
  const start=(page-1)*PAGE_SIZE
  const posts=filtered.slice(start,start+PAGE_SIZE)
  const path=domain==='all'?'/logs':`/logs?domain=${domain}`,url=`${SITE_URL}${path}`
  const buildHref=(nextDomain,nextYear,nextPage=1)=>{
    const params=new URLSearchParams()
    if(nextDomain!=='all')params.set('domain',nextDomain)
    if(nextYear!=='all')params.set('year',nextYear)
    if(nextPage>1)params.set('page',String(nextPage))
    const qs=params.toString()
    return qs?`/logs?${qs}`:'/logs'
  }
  const tokens=pageTokens(page,totalPages)
  const schema={'@context':'https://schema.org','@graph':[{'@type':'CollectionPage','@id':url,url,name:meta.title,description:meta.description,inLanguage:SITE_LANGUAGE,isPartOf:{'@id':WEBSITE_ID},mainEntity:{'@type':'ItemList',numberOfItems:filtered.length,itemListElement:posts.map((post,index)=>({'@type':'ListItem',position:start+index+1,url:`${SITE_URL}/logs/${encodeURIComponent(post.slug)}`,name:post.title,description:post.excerpt}))}},{'@type':'BreadcrumbList','@id':`${url}#breadcrumb`,itemListElement:[{'@type':'ListItem',position:1,name:'首页',item:SITE_URL},{'@type':'ListItem',position:2,name:domain==='all'?'日志':meta.title,item:url}]}]}
  return <><SiteHeader current="logs"/><main className="logs-index" id="content"><StructuredData data={schema}/><header><h1>{domain==='all'?'日志':labels[domain].split('/ ')[1]}</h1><div className="logs-head-actions"><a href="/logs/random">随机读一篇 ↻</a><Link href="/annual">年度盘点 ↗</Link><span>{filtered.length} 篇</span></div></header><div className="logs-filters" aria-label="日志栏目">{domains.map(item=><Link className={item===domain?'active':''} aria-current={item===domain?'page':undefined} href={buildHref(item,'all',1)} key={item}>{item==='all'?'全部':labels[item].split('/ ')[1]}</Link>)}</div>{years.length>1&&<div className="logs-years" aria-label="按年份筛选"><Link className={year==='all'?'active':''} href={buildHref(domain,'all',1)}>全部年份</Link>{years.map(y=><Link className={y===year?'active':''} href={buildHref(domain,y,1)} key={y}>{y}</Link>)}</div>}<section>{posts.map((post,index)=><Link className="log-index-entry" href={`/logs/${encodeURIComponent(post.slug)}`} key={post.id}><span>{String(start+index+1).padStart(2,'0')}</span><div><small>{labels[post.domain]?.split('/ ')[1]||post.domain}</small><h2>{post.title}</h2><p>{post.excerpt}</p></div><time dateTime={post.published_at}>{post.published_at?.slice(0,10)}</time></Link>)}</section>{totalPages>1&&<nav className="logs-pagination" aria-label="日志分页">{page>1?<Link className="page-step" href={buildHref(domain,year,page-1)}>← 上一页</Link>:<span className="page-step is-disabled">← 上一页</span>}<div className="page-numbers">{tokens.map((tok,i)=>tok==='…'?<span className="page-ellipsis" key={`e-${i}`}>…</span>:<Link key={tok} href={buildHref(domain,year,tok)} className={tok===page?'active':''} aria-current={tok===page?'page':undefined}>{tok}</Link>)}</div>{page<totalPages?<Link className="page-step" href={buildHref(domain,year,page+1)}>下一页 →</Link>:<span className="page-step is-disabled">下一页 →</span>}</nav>}</main><SiteFooter/></>
}
