import {createClient,isConfigured} from '@/lib/supabase/server'
import {demoPosts} from '@/lib/demo'
import {SITE_URL} from '@/lib/seo'

const latest=values=>values.filter(Boolean).sort((a,b)=>new Date(b)-new Date(a))[0]

export default async function sitemap(){
  if(!isConfigured()){
    const logDate=latest(demoPosts.map(post=>post.published_at))
    return [
      {url:SITE_URL,lastModified:logDate,changeFrequency:'daily',priority:1},
      {url:`${SITE_URL}/logs`,lastModified:logDate,changeFrequency:'daily',priority:.9},
      {url:`${SITE_URL}/books`,changeFrequency:'weekly',priority:.8},
      {url:`${SITE_URL}/trails`,changeFrequency:'weekly',priority:.8},
      ...demoPosts.map(post=>({url:`${SITE_URL}/logs/${encodeURIComponent(post.slug)}`,lastModified:post.published_at,changeFrequency:'monthly',priority:.7}))
    ]
  }
  const db=await createClient()
  const [{data:posts},{data:trails},{data:books},{data:home}]=await Promise.all([
    db.from('posts').select('slug,published_at,updated_at').eq('status','published').order('updated_at',{ascending:false}),
    db.from('trails').select('slug,updated_at').eq('status','published').order('updated_at',{ascending:false}),
    db.from('books').select('updated_at').order('updated_at',{ascending:false}).limit(1),
    db.from('site_content').select('updated_at').eq('key','home').maybeSingle()
  ])
  const postDate=latest((posts||[]).map(post=>post.updated_at||post.published_at))
  const trailDate=latest((trails||[]).map(trail=>trail.updated_at))
  const bookDate=books?.[0]?.updated_at
  const homeDate=latest([home?.updated_at,postDate,trailDate,bookDate])
  return [
    {url:SITE_URL,lastModified:homeDate,changeFrequency:'daily',priority:1},
    {url:`${SITE_URL}/logs`,lastModified:postDate,changeFrequency:'daily',priority:.9},
    {url:`${SITE_URL}/books`,lastModified:bookDate,changeFrequency:'weekly',priority:.8},
    {url:`${SITE_URL}/trails`,lastModified:trailDate,changeFrequency:'weekly',priority:.8},
    ...(posts||[]).map(post=>({url:`${SITE_URL}/logs/${encodeURIComponent(post.slug)}`,lastModified:post.updated_at||post.published_at,changeFrequency:'monthly',priority:.7})),
    ...(trails||[]).map(trail=>({url:`${SITE_URL}/trails/${encodeURIComponent(trail.slug)}`,lastModified:trail.updated_at,changeFrequency:'monthly',priority:.7}))
  ]
}
