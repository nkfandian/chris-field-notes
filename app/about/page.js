import Link from 'next/link'
import SiteHeader from '../components/site-header'
import SiteFooter from '../components/site-footer'
import StructuredData from '../components/structured-data'
import {createPublicClient,isConfigured} from '@/lib/supabase/server'
import {resolveAboutConfig} from '@/lib/about'
import {AUTHOR_ID,AUTHOR_URL,SITE_LANGUAGE,SITE_URL,WEBSITE_ID,pageMetadata} from '@/lib/seo'
import './about.css'

export const dynamic='force-dynamic'
export const metadata=pageMetadata({
 title:'关于与漫游指南',
 description:'关于作者 Chris 与这个独立小站的体验指南：和 AI 作者对话、私人书方签、盲品一页书、十八年日志归档与日常微博。',
 path:'/about',
 keywords:['Chris','关于本站','AI作者对话','私人书方签','独立博客','个人网站']
})

function renderBodyBlocks(body=''){
 const lines=String(body||'').split('\n').map(l=>l.trim()).filter(Boolean)
 const blocks=[]
 let bullets=[]
 const flushBullets=()=>{
  if(bullets.length){
   blocks.push({type:'ul',items:bullets})
   bullets=[]
  }
 }
 for(const ln of lines){
  if(/^[•\-*]\s*/.test(ln)){
   bullets.push(ln.replace(/^[•\-*]\s*/,''))
  }else{
   flushBullets()
   blocks.push({type:'p',text:ln})
  }
 }
 flushBullets()
 return blocks
}

export default async function AboutPage(){
 let config=resolveAboutConfig({})
 let updated
 let stats=null

 if(isConfigured()){
  const db=createPublicClient()
  const [{data:about},{count:pCount},{count:bCount},{count:readCount},{count:wCount},{count:tCount}]=await Promise.all([
   db.from('site_content').select('value,updated_at').eq('key','about').maybeSingle(),
   db.from('posts').select('id',{count:'exact',head:true}).eq('status','published'),
   db.from('books').select('id',{count:'exact',head:true}),
   db.from('books').select('id',{count:'exact',head:true}).eq('status','Read'),
   db.from('weibos').select('id',{count:'exact',head:true}).eq('status','published'),
   db.from('trails').select('id',{count:'exact',head:true}).eq('status','published')
  ])
  config=resolveAboutConfig(about?.value||{})
  updated=about?.updated_at
  stats={
   posts:pCount||0,
   books:bCount||0,
   readBooks:readCount||0,
   weibos:wCount||0,
   trails:tCount||0
  }
 }

 const schema={'@context':'https://schema.org','@graph':[
  {'@type':'ProfilePage','@id':AUTHOR_URL,url:AUTHOR_URL,name:config.headline,description:metadata.description,inLanguage:SITE_LANGUAGE,isPartOf:{'@id':WEBSITE_ID},dateModified:updated,mainEntity:{'@type':'Person','@id':AUTHOR_ID,name:'Chris',url:AUTHOR_URL,description:config.intro,knowsAbout:['阅读','非虚构写作','中国近现代史','教育观察','人工智能实践','个人知识管理']}},
  {'@type':'BreadcrumbList','@id':`${AUTHOR_URL}#breadcrumb`,itemListElement:[{'@type':'ListItem',position:1,name:'首页',item:SITE_URL},{'@type':'ListItem',position:2,name:'关于',item:AUTHOR_URL}]}
 ]}

 const introParas=String(config.intro||'').split(/\n+/).map(s=>s.trim()).filter(Boolean)

 return <>
  <SiteHeader current="about"/>
  <main className="about-guide-page" id="content">
   <StructuredData data={schema}/>

   <header className="about-hero">
    <div className="about-kicker"><span>ABOUT &amp; FIELD GUIDE</span><i aria-hidden="true"/><span>2008 — 2026</span></div>
    <h1>{config.headline}</h1>
    <div className="about-intro">
     {introParas.map((p,idx)=><p key={idx}>{p}</p>)}
    </div>

    {stats&&<div className="about-stats" aria-label="全站实时归档规模">
     <div className="about-stat"><small>LOGS / 长文归档</small><strong>{stats.posts.toLocaleString('en-US')}<span>篇</span></strong></div>
     <div className="about-stat"><small>SHELF / 中英文书单</small><strong>{stats.books.toLocaleString('en-US')}<span>本（已读 {stats.readBooks}）</span></strong></div>
     <div className="about-stat"><small>NOTES / 微博随记</small><strong>{stats.weibos.toLocaleString('en-US')}<span>条</span></strong></div>
     <div className="about-stat"><small>ROUTES / 主题轨迹</small><strong>{stats.trails.toLocaleString('en-US')}<span>条</span></strong></div>
    </div>}
   </header>

   <div className="about-body">
    <aside className="about-toc" aria-label="体验指南目录">
     <span className="about-toc-label">EXPLORE / 导览顺序</span>
     <ol>
      {config.sections.map((sec,idx)=><li key={sec.id}>
       <a href={`#guide-${sec.id}`}>
        <b>{String(idx+1).padStart(2,'0')}</b>
        <span>{sec.title.replace(/（.*?）|\(.*?\)/g,'').trim()}</span>
       </a>
      </li>)}
     </ol>
    </aside>

    <div className="about-main">
     {config.guideLead&&<p className="about-lead">{config.guideLead}</p>}
     <div className="about-cards">
      {config.sections.map((sec,idx)=>{
       const blocks=renderBodyBlocks(sec.body)
       return <section className="about-card" id={`guide-${sec.id}`} key={sec.id}>
        <header className="about-card-head">
         <span className="about-card-no">PRIORITY {String(idx+1).padStart(2,'0')}</span>
         {sec.badge&&<span className="about-card-badge">{sec.badge}</span>}
        </header>
        <h2>{sec.title}</h2>
        <div className="about-card-copy">
         {blocks.map((blk,bIdx)=>blk.type==='ul'
          ?<ul key={bIdx}>{blk.items.map((it,iIdx)=><li key={iIdx}>{it}</li>)}</ul>
          :<p key={bIdx}>{blk.text}</p>
         )}
        </div>
        {sec.actions?.length>0&&<div className="about-card-actions">
         {sec.actions.map((act,aIdx)=>{
          const cls=act.primary?'about-action-primary':'about-action-secondary'
          const isHashOrExt=act.href.startsWith('#')||act.href.startsWith('http')||act.href.endsWith('.xml')
          return isHashOrExt
           ?<a key={aIdx} className={cls} href={act.href}>{act.label}</a>
           :<Link key={aIdx} className={cls} href={act.href}>{act.label}</Link>
         })}
        </div>}
       </section>
      })}
     </div>
    </div>
   </div>
  </main>
  <SiteFooter/>
 </>
}
