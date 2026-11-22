import Link from 'next/link'
import SiteHeader from '../components/site-header'
import SiteFooter from '../components/site-footer'
import StructuredData from '../components/structured-data'
import PostBody from '../logs/[slug]/post-body'
import {createAdminClient} from '@/lib/supabase/admin'
import {createPublicClient,isConfigured} from '@/lib/supabase/server'
import {SITE_LANGUAGE,SITE_URL,pageMetadata} from '@/lib/seo'
import './newsletter.css'

export const revalidate=300
export const metadata=pageMetadata({
 title:'往期通信',
 description:'CHRIS / FIELD NOTES 订阅邮件往期归档：曾经发给订阅者的新日志与专刊通信。',
 path:'/newsletter',
 keywords:['Newsletter','邮件订阅','往期归档']
})

export default async function NewsletterPage(){
 let issues=[]
 if(isConfigured()){
  let campaigns=[]
  try{
   const admin=createAdminClient()
   const {data}=await admin.from('email_campaigns').select('id,subject,body,sent_at,created_at,status').in('status',['sent','partial']).eq('is_public',true).order('sent_at',{ascending:false}).limit(50)
   campaigns=data||[]
  }catch{}
  const db=createPublicClient()
  const {data:sentPosts}=await db.from('posts').select('id,slug,title,excerpt,published_at,notification_sent_at').eq('status','published').not('notification_sent_at','is',null).not('slug','like','archive-%').order('published_at',{ascending:false}).limit(60)
  const manualIssues=campaigns.map(c=>({
   id:`campaign-${c.id}`,
   kind:'manual',
   title:c.subject,
   date:String(c.sent_at||c.created_at||'').slice(0,10),
   body:c.body,
   href:null
  }))
  const postIssues=(sentPosts||[]).map(p=>({
   id:`post-${p.id}`,
   kind:'post',
   title:p.title,
   date:String(p.published_at||'').slice(0,10),
   excerpt:p.excerpt,
   href:`/logs/${encodeURIComponent(p.slug)}`
  }))
  issues=[...manualIssues,...postIssues].sort((a,b)=>b.date.localeCompare(a.date))
 }

 const schema={'@context':'https://schema.org','@type':'CollectionPage',name:'往期通信',url:`${SITE_URL}/newsletter`,inLanguage:SITE_LANGUAGE}

 return <>
  <SiteHeader/>
  <main className="newsletter-page" id="content">
   <StructuredData data={schema}/>
   <header>
    <h1>往期通信</h1>
    <div className="newsletter-actions">
     <a href="#subscribe">订阅更新 ↓</a>
     <span>{issues.length} 期</span>
    </div>
   </header>
   {issues.length>0?<section className="newsletter-list">
    {issues.map((item,i)=><article className="newsletter-item" key={item.id}>
     <span className="newsletter-no">{String(i+1).padStart(2,'0')}</span>
     <div className="newsletter-main">
      <div className="newsletter-meta">
       <small>{item.kind==='manual'?'专刊通信':'新日志推送'}</small>
       <time dateTime={item.date}>{item.date}</time>
      </div>
      {item.href?<>
       <h2><Link href={item.href}>{item.title}</Link></h2>
       {item.excerpt&&<p className="newsletter-excerpt">{item.excerpt}</p>}
      </>:<>
       <h2>{item.title}</h2>
       <details className="newsletter-detail">
        <summary>展开全文</summary>
        <div className="newsletter-body"><PostBody body={item.body}/></div>
       </details>
      </>}
     </div>
    </article>)}
   </section>:<p className="newsletter-empty">暂无往期通信记录。</p>}
  </main>
  <SiteFooter/>
 </>
}
