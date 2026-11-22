import Link from 'next/link'
import SiteHeader from '../components/site-header'
import SiteFooter from '../components/site-footer'
import StructuredData from '../components/structured-data'
import WeiboFeed from '../components/weibo-feed'
import {listPublicWeibosPage,weiboExcerpt} from '@/lib/weibo'
import {AUTHOR_ID,SITE_LANGUAGE,SITE_URL,WEBSITE_ID,pageMetadata} from '@/lib/seo'
import './weibo.css'

export const revalidate=60
export const metadata=pageMetadata({
 title:'微博',
 description:'日常细碎想法、阅读摘记与即兴记录，按发布时间排列。',
 path:'/weibo',
 keywords:['微博','随记','阅读摘记','日常记录']
})

const PAGE_SIZE=20
function buildPageList(current,total){
 if(total<=7)return Array.from({length:total},(_,i)=>i+1)
 const pages=[1]
 if(current>3)pages.push('...')
 for(let p=Math.max(2,current-1);p<=Math.min(total-1,current+1);p++)pages.push(p)
 if(current<total-2)pages.push('...')
 pages.push(total)
 return pages
}

export default async function WeiboPage({searchParams}){
 const sp=await searchParams
 const requested=Math.max(1,Number(sp?.page)||1)
 const {items:weibos,total,page}=await listPublicWeibosPage({page:requested,pageSize:PAGE_SIZE,withComments:true})
 const totalPages=Math.max(1,Math.ceil(total/PAGE_SIZE))
 const currentPage=Math.min(page,totalPages)
 const pageList=buildPageList(currentPage,totalPages)
 const pageHref=p=>p<=1?'/weibo':`/weibo?page=${p}`
 const url=`${SITE_URL}/weibo`
 const schema={
  '@context':'https://schema.org',
  '@graph':[
   {
    '@type':'CollectionPage',
    '@id':url,
    url,
    name:'微博',
    description:metadata.description,
    inLanguage:SITE_LANGUAGE,
    isPartOf:{'@id':WEBSITE_ID},
    author:{'@id':AUTHOR_ID},
    mainEntity:{
     '@type':'ItemList',
     numberOfItems:total,
     itemListElement:weibos.map((item,index)=>({
      '@type':'ListItem',
      position:(currentPage-1)*PAGE_SIZE+index+1,
      url:`${url}#${encodeURIComponent(item.slug)}`,
      name:weiboExcerpt(item.body,48)
     }))
    }
   },
   {
    '@type':'BreadcrumbList',
    '@id':`${url}#breadcrumb`,
    itemListElement:[
     {'@type':'ListItem',position:1,name:'首页',item:SITE_URL},
     {'@type':'ListItem',position:2,name:'微博',item:url}
    ]
   }
  ]
 }
 return <>
  <SiteHeader current="weibo"/>
  <main className="weibo-page" id="content">
   <StructuredData data={schema}/>
   <header>
    <h1>微博</h1>
    <span>第 {currentPage} / {totalPages} 页 · 共 {total} 条</span>
   </header>
   <WeiboFeed items={weibos}/>
   {totalPages>1&&<nav className="weibo-pagination" aria-label="微博分页">
    <Link className={`page-step${currentPage<=1?' is-disabled':''}`} href={pageHref(currentPage-1)} aria-disabled={currentPage<=1}>← 上一页</Link>
    <div className="page-numbers">{pageList.map((item,idx)=>item==='...'?<span className="page-ellipsis" key={`e-${idx}`}>…</span>:<Link key={item} href={pageHref(item)} className={item===currentPage?'active':undefined} aria-current={item===currentPage?'page':undefined}>{item}</Link>)}</div>
    <Link className={`page-step${currentPage>=totalPages?' is-disabled':''}`} href={pageHref(currentPage+1)} aria-disabled={currentPage>=totalPages}>下一页 →</Link>
   </nav>}
  </main>
  <SiteFooter/>
 </>
}
