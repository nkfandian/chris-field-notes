import SiteHeader from '../components/site-header'
import SiteFooter from '../components/site-footer'
import StructuredData from '../components/structured-data'
import WeiboFeed from '../components/weibo-feed'
import {listPublicWeibos,weiboExcerpt} from '@/lib/weibo'
import {AUTHOR_ID,SITE_LANGUAGE,SITE_URL,WEBSITE_ID,pageMetadata} from '@/lib/seo'
import './weibo.css'

export const revalidate=60
export const metadata=pageMetadata({
 title:'微博',
 description:'日常细碎想法、阅读摘记与即兴记录，按发布时间排列。',
 path:'/weibo',
 keywords:['微博','随记','阅读摘记','日常记录']
})

export default async function WeiboPage(){
 const weibos=await listPublicWeibos({limit:100,withComments:true})
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
     numberOfItems:weibos.length,
     itemListElement:weibos.slice(0,30).map((item,index)=>({
      '@type':'ListItem',
      position:index+1,
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
    <span>{weibos.length} 条</span>
   </header>
   {weibos.length>0?<WeiboFeed items={weibos}/>:<p className="weibo-empty">暂无微博。</p>}
  </main>
  <SiteFooter/>
 </>
}
