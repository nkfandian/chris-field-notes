import Link from 'next/link'
import SiteHeader from '../components/site-header'
import SiteFooter from '../components/site-footer'
import StructuredData from '../components/structured-data'
import {createPublicClient,isConfigured} from '@/lib/supabase/server'
import {demoPosts,labels} from '@/lib/demo'
import {listPublicWeibos} from '@/lib/weibo'
import {SITE_LANGUAGE,SITE_URL,pageMetadata,plainText} from '@/lib/seo'
import './annual.css'

export const revalidate=300
export const metadata=pageMetadata({
 title:'年度盘点',
 description:'按年份汇总 CHRIS / FIELD NOTES 的写作字数、日志篇数、微博记录与栏目分布。',
 path:'/annual',
 keywords:['年度盘点','写作统计','年度报告']
})

export default async function AnnualPage({searchParams}){
 const sp=await searchParams
 let posts=demoPosts,weibos=[],books=[]
 if(isConfigured()){
  const db=createPublicClient()
  const [{data:p},w]=await Promise.all([
   db.from('posts').select('id,slug,title,domain,body,excerpt,published_at').eq('status','published').order('published_at',{ascending:false}),
   listPublicWeibos({limit:5000,withComments:false})
  ])
  for(let from=0;from<5000;from+=1000){
   const {data:b}=await db.from('books').select('id,title,author,status,rating,created_at').order('created_at',{ascending:false}).range(from,from+999)
   if(!b||!b.length)break
   books.push(...b)
   if(b.length<1000)break
  }
  posts=p||[]
  weibos=w||[]
 }
 const years=[...new Set([
  ...posts.map(p=>String(p.published_at||'').slice(0,4)),
  ...weibos.map(w=>String(w.published_at||'').slice(0,4))
 ].filter(y=>/^\d{4}$/.test(y)))].sort((a,b)=>b.localeCompare(a))

 const requested=String(sp?.year||'')
 const year=years.includes(requested)?requested:(years[0]||'2026')
 const yearPosts=posts.filter(p=>String(p.published_at||'').startsWith(year))
 const yearWeibos=weibos.filter(w=>String(w.published_at||'').startsWith(year))
 const yearBooks=books.filter(b=>String(b.created_at||'').startsWith(year))
 const cumulativeBooks=books.filter(b=>{const y=String(b.created_at||'').slice(0,4);return /^\d{4}$/.test(y)&&y<=year}).length
 const postChars=yearPosts.reduce((sum,p)=>sum+plainText(p.body||p.excerpt||'').replace(/\s/g,'').length,0)
 const weiboChars=yearWeibos.reduce((sum,w)=>sum+plainText(w.body||'').replace(/\s/g,'').length,0)
 const totalChars=postChars+weiboChars
 const domainCounts={}
 for(const p of yearPosts)domainCounts[p.domain]=(domainCounts[p.domain]||0)+1
 const domainList=Object.entries(domainCounts).sort((a,b)=>b[1]-a[1])

 const schema={'@context':'https://schema.org','@type':'CollectionPage',name:`${year} 年度盘点`,url:`${SITE_URL}/annual?year=${year}`,inLanguage:SITE_LANGUAGE}

 return <>
  <SiteHeader current="logs"/>
  <main className="annual-page" id="content">
   <StructuredData data={schema}/>
   <header className="annual-head">
    <h1>{year} 年度盘点</h1>
    <div className="annual-years" aria-label="选择年份">
     {years.map(y=><Link key={y} href={`/annual?year=${y}`} className={y===year?'active':''}>{y}</Link>)}
    </div>
   </header>

   <section className="annual-metrics" aria-label="年度统计">
    <div><small>日志</small><strong>{yearPosts.length}</strong><span>篇</span></div>
    <div><small>微博</small><strong>{yearWeibos.length}</strong><span>条</span></div>
    <div><small>总字数</small><strong>{(totalChars/10000).toFixed(1)}</strong><span>万字</span></div>
    <div><small>当年书单</small><strong>{yearBooks.length}</strong><span>本（累计 {cumulativeBooks} 本）</span></div>
   </section>

   {domainList.length>0&&<section className="annual-domains">
    <h2>栏目分布</h2>
    <div>{domainList.map(([key,count])=><Link key={key} href={`/logs?domain=${key}&year=${year}`}><span>{labels[key]?.split('/ ')[1]||key}</span><b>{count} 篇</b></Link>)}</div>
   </section>}

   <section className="annual-timeline">
    <h2>{year} 年日志目录</h2>
    {yearPosts.length>0?<ol>{yearPosts.map((p,i)=><li key={p.id}><span>{String(i+1).padStart(2,'0')}</span><time dateTime={p.published_at}>{p.published_at?.slice(0,10)}</time><Link href={`/logs/${encodeURIComponent(p.slug)}`}>{p.title}</Link><small>{labels[p.domain]?.split('/ ')[1]||p.domain}</small></li>)}</ol>:<p className="annual-empty">该年度暂无日志。</p>}
   </section>
  </main>
  <SiteFooter/>
 </>
}
