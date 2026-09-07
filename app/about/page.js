import Link from 'next/link'
import Logo from '../components/logo'
import StructuredData from '../components/structured-data'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {normalizeAbout} from '@/lib/about'
import {SITE_DESCRIPTION,SITE_LANGUAGE,SITE_NAME,SITE_URL,WEBSITE_ID} from '@/lib/seo'
import './about.css'

export const dynamic='force-dynamic'
export const metadata={
 title:'ABOUT',
 description:`关于 ${SITE_NAME}：日志、书单与阅读轨迹组成的个人开放索引。`,
 alternates:{canonical:'/about',languages:{'zh-CN':'/about','x-default':'/about'}}
}

export default async function AboutPage(){
 let about=normalizeAbout()
 if(isConfigured()){
  const db=await createClient()
  const [{data:aboutRow},{data:homeRow}]=await Promise.all([
   db.from('site_content').select('value').eq('key','about').maybeSingle(),
   db.from('site_content').select('value').eq('key','home').maybeSingle()
  ])
  about=normalizeAbout(aboutRow?.value||{},homeRow?.value||{})
 }
 const paragraphs=String(about.body||'').split(/\n{2,}/).map(value=>value.trim()).filter(Boolean)
 const schema={'@context':'https://schema.org','@type':'AboutPage','@id':`${SITE_URL}/about#page`,url:`${SITE_URL}/about`,name:about.title,description:about.lead||SITE_DESCRIPTION,inLanguage:SITE_LANGUAGE,isPartOf:{'@id':WEBSITE_ID},about:{'@type':'WebSite',name:SITE_NAME,url:SITE_URL}}
 return <main className="about-page">
  <StructuredData data={schema}/>
  <nav className="about-nav"><Link href="/" aria-label="CHRIS / FIELD NOTES 首页"><Logo compact/></Link><span>ABOUT / OPEN INDEX</span><Link href="/">返回首页 ↗</Link></nav>
  <header className="about-hero">
   <div className="about-folio"><span>00</span><i/><b>FIELD NOTES</b></div>
   <h1>{about.title}</h1>
   <p>{about.lead}</p>
  </header>
  <section className="about-statement" aria-label="网站原则"><small>WORKING PRINCIPLE / 工作原则</small><blockquote>“{about.statement}”</blockquote></section>
  <section className="about-body">
   <aside><small>INDEX / 05 MODES</small><ol><li>解码</li><li>执行</li><li>部署</li><li>跋涉</li><li>溯源</li></ol></aside>
   <article><header><span>WHY THIS EXISTS</span><h2>留下理解发生的过程。</h2></header>{paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}</article>
  </section>
  <footer className="about-footer"><span>CHRIS / FIELD NOTES</span><span>{new Date().getFullYear()} · OPEN INDEX</span><Link href="/privacy">隐私政策 →</Link></footer>
 </main>
}
