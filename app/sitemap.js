import {createClient,isConfigured} from '@/lib/supabase/server'
import {demoPosts} from '@/lib/demo'
import {SITE_URL,firstPostImage} from '@/lib/seo'

const latest=values=>values.filter(Boolean).sort((a,b)=>new Date(b)-new Date(a))[0]
const domains=['decode','execute','deploy','trek','roots']
const categoryEntries=posts=>domains.map(domain=>{
  const rows=posts.filter(post=>post.domain===domain)
  return rows.length?{url:`${SITE_URL}/logs?domain=${domain}`,lastModified:latest(rows.map(post=>post.updated_at||post.published_at)),changeFrequency:'weekly',priority:.72}:null
}).filter(Boolean)
const postEntry=post=>{
  const image=firstPostImage(post.body)
  return {url:`${SITE_URL}/logs/${encodeURIComponent(post.slug)}`,lastModified:post.updated_at||post.published_at,changeFrequency:'monthly',priority:.7,...(image?{images:[image]}:{})}
}

export default async function sitemap(){
  if(!isConfigured()){
    const logDate=latest(demoPosts.map(post=>post.published_at))
    return [
      {url:SITE_URL,lastModified:logDate,changeFrequency:'daily',priority:1},
      {url:`${SITE_URL}/logs`,lastModified:logDate,changeFrequency:'daily',priority:.9},
      ...categoryEntries(demoPosts),
      {url:`${SITE_URL}/books`,changeFrequency:'weekly',priority:.8},
      {url:`${SITE_URL}/trails`,changeFrequency:'weekly',priority:.8},
      {url:`${SITE_URL}/about`,changeFrequency:'monthly',priority:.65},
      {url:`${SITE_URL}/privacy`,lastModified:'2026-07-16',changeFrequency:'yearly',priority:.3},
      ...demoPosts.map(postEntry)
    ]
  }
  const db=await createClient()
  const [{data:posts},{data:trails},{data:books},{data:home},{data:about}]=await Promise.all([
    db.from('posts').select('slug,domain,body,published_at,updated_at').eq('status','published').order('updated_at',{ascending:false}),
    db.from('trails').select('slug,updated_at').eq('status','published').order('updated_at',{ascending:false}),
    db.from('books').select('updated_at').order('updated_at',{ascending:false}).limit(1),
    db.from('site_content').select('updated_at').eq('key','home').maybeSingle(),
    db.from('site_content').select('updated_at').eq('key','about').maybeSingle()
  ])
  const postDate=latest((posts||[]).map(post=>post.updated_at||post.published_at))
  const trailDate=latest((trails||[]).map(trail=>trail.updated_at))
  const bookDate=books?.[0]?.updated_at
  const homeDate=latest([home?.updated_at,postDate,trailDate,bookDate])
  return [
    {url:SITE_URL,lastModified:homeDate,changeFrequency:'daily',priority:1},
    {url:`${SITE_URL}/logs`,lastModified:postDate,changeFrequency:'daily',priority:.9},
    ...categoryEntries(posts||[]),
    {url:`${SITE_URL}/books`,lastModified:bookDate,changeFrequency:'weekly',priority:.8},
    {url:`${SITE_URL}/trails`,lastModified:trailDate,changeFrequency:'weekly',priority:.8},
    {url:`${SITE_URL}/about`,lastModified:about?.updated_at,changeFrequency:'monthly',priority:.65},
    {url:`${SITE_URL}/privacy`,lastModified:'2026-07-16',changeFrequency:'yearly',priority:.3},
    ...(posts||[]).map(postEntry),
    ...(trails||[]).map(trail=>({url:`${SITE_URL}/trails/${encodeURIComponent(trail.slug)}`,lastModified:trail.updated_at,changeFrequency:'monthly',priority:.7}))
  ]
}
