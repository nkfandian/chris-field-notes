import Link from 'next/link'
import Logo from '../components/logo'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {labels} from '@/lib/demo'
import {pageMetadata} from '@/lib/seo'
import './search.css'

export const dynamic='force-dynamic'
export const metadata={...pageMetadata({title:'全站搜索',description:'检索日志正文、书单与阅读轨迹。',path:'/search'}),robots:{index:false,follow:true}}
const text=v=>String(v||'').toLocaleLowerCase('zh-CN')
const plain=v=>String(v||'').replace(/!\[[^\]]*\]\([^)]+\)/g,' ').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/<[^>]+>/g,' ').replace(/[`#>*_~]/g,' ').replace(/\s+/g,' ').trim()
const contextualSnippet=(post,needle)=>{
  const body=plain(post.body),at=text(body).indexOf(needle)
  if(at<0)return plain(post.excerpt||post.thesis).slice(0,220)
  const start=Math.max(0,at-55),end=Math.min(body.length,at+needle.length+120)
  return `${start?'…':''}${body.slice(start,end)}${end<body.length?'…':''}`
}

export default async function SearchPage({searchParams}){
  const q=String((await searchParams)?.q||'').trim().slice(0,80),needle=text(q)
  let posts=[],books=[],trails=[]
  if(q&&isConfigured()){
    const db=await createClient()
    const [{data:p},{data:b},{data:t}]=await Promise.all([
      db.from('posts').select('id,slug,title,excerpt,body,thesis,tools,domain,tags,published_at').eq('status','published').order('published_at',{ascending:false}),
      db.from('books').select('id,title,author,review,custom_lists,linked_post_slug').order('sort_order'),
      db.from('trails').select('id,slug,title,summary,status').eq('status','published').order('updated_at',{ascending:false})
    ])
    posts=(p||[]).filter(x=>text([x.title,x.excerpt,x.body,x.thesis,x.tools,x.domain,...(x.tags||[])].join(' ')).includes(needle)).map(x=>({...x,searchSnippet:contextualSnippet(x,needle)}))
    books=(b||[]).filter(x=>text([x.title,x.author,x.review,...(x.custom_lists||[])].join(' ')).includes(needle))
    trails=(t||[]).filter(x=>text([x.title,x.summary].join(' ')).includes(needle))
  }
  const count=posts.length+books.length+trails.length
  return <main className="search-page"><nav><Link href="/"><Logo compact/></Link><span>搜索</span><Link href="/logs">日志</Link></nav><header><form><label htmlFor="q">关键词</label><input id="q" name="q" defaultValue={q} autoFocus placeholder="书名、主题、作者或正文"/><button>搜索</button></form>{q&&<p>共 {count} 条结果</p>}</header>{q&&<section className="search-results"><Result title="日志" items={posts} render={x=><Link href={`/logs/${encodeURIComponent(x.slug)}`}><small>{labels?.[x.domain]||x.domain} · {x.published_at}</small><h2>{x.title}</h2><p>{x.searchSnippet}</p></Link>}/><Result title="书单" items={books} render={x=><Link href={`/books#book-${x.id}`}><small>{x.author||'作者未录入'}</small><h2>{x.title}</h2><p>{x.review}</p></Link>}/><Result title="轨迹" items={trails} render={x=><Link href={`/trails/${encodeURIComponent(x.slug)}`}><h2>{x.title}</h2><p>{x.summary}</p></Link>}/>{!count&&<div className="search-empty">没有找到匹配内容。</div>}</section>}</main>
}
function Result({title,items,render}){if(!items.length)return null;return <section className="result-group"><header><h2>{title}</h2><span>{String(items.length).padStart(2,'0')}</span></header><div>{items.map(x=><article key={x.id}>{render(x)}</article>)}</div></section>}
