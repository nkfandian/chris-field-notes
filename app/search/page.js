import Link from 'next/link'
import SiteHeader from '../components/site-header'
import SiteFooter from '../components/site-footer'
import AskArchive from './ask-archive'
import {createPublicClient,isConfigured} from '@/lib/supabase/server'
import {labels} from '@/lib/demo'
import {listPublicWeibos} from '@/lib/weibo'
import {pageMetadata} from '@/lib/seo'
import './search.css'

export const dynamic='force-dynamic'
export const metadata={...pageMetadata({title:'全站搜索',description:'检索日志正文、微博、书单与阅读轨迹。',path:'/search'}),robots:{index:false,follow:true}}
const text=v=>String(v||'').toLocaleLowerCase('zh-CN')
const plain=v=>String(v||'').replace(/!\[[^\]]*\]\([^)]+\)/g,' ').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/<[^>]+>/g,' ').replace(/[`#>*_~]/g,' ').replace(/\s+/g,' ').trim()
const contextualSnippet=(post,needle)=>{
  const body=plain(post.body),at=text(body).indexOf(needle)
  if(at<0)return plain(post.excerpt).slice(0,220)
  const start=Math.max(0,at-55),end=Math.min(body.length,at+needle.length+120)
  return `${start?'…':''}${body.slice(start,end)}${end<body.length?'…':''}`
}

async function fetchAllRows(buildQuery){
  const rows=[]
  for(let from=0;from<5000;from+=1000){
    const {data}=await buildQuery().range(from,from+999)
    if(!data||!data.length)break
    rows.push(...data)
    if(data.length<1000)break
  }
  return rows
}

export default async function SearchPage({searchParams}){
  const sp=await searchParams
  const mode=sp?.mode==='ask'?'ask':'keyword'
  const q=String(sp?.q||'').trim().slice(0,80),needle=text(q)
  let posts=[],weibos=[],books=[],trails=[]
  let archiveCounts=null
  if(mode==='ask'&&isConfigured()){
    const db=createPublicClient()
    const [{count:pCount},{count:bCount},{count:wCount}]=await Promise.all([
      db.from('posts').select('id',{count:'exact',head:true}).eq('status','published'),
      db.from('books').select('id',{count:'exact',head:true}),
      db.from('weibos').select('id',{count:'exact',head:true}).eq('status','published')
    ])
    archiveCounts={posts:pCount||0,books:bCount||0,weibos:wCount||0}
  }
  if(mode==='keyword'&&q&&isConfigured()){
    const db=createPublicClient()
    const [p,w,b,{data:t}]=await Promise.all([
      fetchAllRows(()=>db.from('posts').select('id,slug,title,excerpt,body,tools,domain,tags,published_at').eq('status','published').order('published_at',{ascending:false})),
      listPublicWeibos({limit:5000,withComments:false}),
      fetchAllRows(()=>db.from('books').select('id,title,author,review,custom_lists,linked_post_slug').order('sort_order')),
      db.from('trails').select('id,slug,title,summary,status').eq('status','published').order('updated_at',{ascending:false}).limit(100)
    ])
    posts=(p||[]).filter(x=>text([x.title,x.excerpt,x.body,x.tools,x.domain,...(x.tags||[])].join(' ')).includes(needle)).map(x=>({...x,searchSnippet:contextualSnippet(x,needle)}))
    weibos=(w||[]).filter(x=>text(x.body).includes(needle)).map(x=>({...x,searchSnippet:contextualSnippet(x,needle)}))
    books=(b||[]).filter(x=>text([x.title,x.author,x.review,...(x.custom_lists||[])].join(' ')).includes(needle))
    trails=(t||[]).filter(x=>text([x.title,x.summary].join(' ')).includes(needle))
  }
  const count=posts.length+weibos.length+books.length+trails.length
  return <><SiteHeader current={mode==='ask'?'ask':'search'}/><main className="search-page" id="content"><header><h1>{mode==='ask'?'和 AI 作者对话':'搜索'}</h1><div className="search-modes" role="tablist"><Link href="/search" className={mode==='keyword'?'active':''}>关键词检索</Link><Link href="/search?mode=ask" className={mode==='ask'?'active':''}>✦ 和 AI 作者对话</Link></div>{mode==='ask'?<AskArchive counts={archiveCounts}/>:<><form><label htmlFor="q">关键词</label><input id="q" name="q" defaultValue={q} autoFocus placeholder="书名、主题、作者或正文"/><button>搜索</button></form>{q&&<p>共 {count} 条结果</p>}</>}</header>{mode==='keyword'&&q&&<section className="search-results"><Result title="日志" items={posts} render={x=><Link href={`/logs/${encodeURIComponent(x.slug)}`}><small>{labels?.[x.domain]||x.domain} · {x.published_at}</small><h2>{x.title}</h2><p>{x.searchSnippet}</p></Link>}/><Result title="微博" items={weibos} render={x=><Link href={`/weibo?focus=${encodeURIComponent(x.slug)}#${encodeURIComponent(x.slug)}`}><small>{String(x.published_at||'').slice(0,10)}</small><p>{x.searchSnippet}</p></Link>}/><Result title="书单" items={books} render={x=><Link href={`/books#book-${x.id}`}><small>{x.author||'作者未录入'}</small><h2>{x.title}</h2><p>{x.review}</p></Link>}/><Result title="轨迹" items={trails} render={x=><Link href={`/trails/${encodeURIComponent(x.slug)}`}><h2>{x.title}</h2><p>{x.summary}</p></Link>}/>{!count&&<div className="search-empty">没有找到匹配内容。</div>}</section>}</main><SiteFooter/></>
}
function Result({title,items,render}){if(!items.length)return null;return <section className="result-group"><header><h2>{title}</h2><span>{String(items.length).padStart(2,'0')}</span></header><div>{items.map(x=><article key={x.id}>{render(x)}</article>)}</div></section>}
