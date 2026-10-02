import Link from 'next/link'
import SiteHeader from '../components/site-header'
import SiteFooter from '../components/site-footer'
import {trailComposition} from '@/lib/trails'
import {createClient,isConfigured} from '@/lib/supabase/server'
import StructuredData from '../components/structured-data'
import {SITE_LANGUAGE,SITE_URL,pageMetadata} from '@/lib/seo'
import './trails.css'
export const revalidate=60
export const metadata=pageMetadata({title:'阅读轨迹',description:'将日志与书籍组织为可循迹阅读的主题路径，从问题出发连接文章、书与短注。',path:'/trails',keywords:['主题阅读','阅读路径','知识连接']})
export default async function TrailsPage(){let trails=[];if(isConfigured()){const db=await createClient();const {data}=await db.from('trails').select('id,slug,title,summary,updated_at,trail_items(id,item_type)').eq('status','published').order('updated_at',{ascending:false});trails=data||[]}const schema={'@context':'https://schema.org','@type':'CollectionPage',name:'阅读轨迹',description:'将日志与书籍组织为可循迹阅读的主题路径。',url:`${SITE_URL}/trails`,inLanguage:SITE_LANGUAGE,mainEntity:{'@type':'ItemList',numberOfItems:trails.length,itemListElement:trails.map((trail,index)=>({'@type':'ListItem',position:index+1,url:`${SITE_URL}/trails/${encodeURIComponent(trail.slug)}`,name:trail.title,description:trail.summary}))}};return <><SiteHeader current="trails"/><main className="trails-page" id="content"><StructuredData data={schema}/><header className="trails-head"><h1>轨迹</h1></header><section className="trail-index">{trails.map((t,i)=><Link href={`/trails/${encodeURIComponent(t.slug)}`} key={t.id}><span>{String(i+1).padStart(2,'0')}</span><div><small>{trailComposition(t.trail_items)}</small><h2>{t.title}</h2><p>{t.summary}</p></div><b aria-hidden="true">→</b></Link>)}{!trails.length&&<p className="trail-empty">暂无轨迹。</p>}</section></main><SiteFooter/></>}
