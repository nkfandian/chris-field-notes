import HomeClient from './home-client'
import {demoPosts} from '@/lib/demo'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'
import StructuredData from './components/structured-data'
import {SITE_DESCRIPTION,SITE_LANGUAGE,SITE_NAME,SITE_URL,WEBSITE_ID} from '@/lib/seo'
import {DEFAULT_ABOUT_TEXT,resolveAboutText} from '@/lib/about'
export const dynamic='force-dynamic'
export const metadata={alternates:{canonical:'/',languages:{'zh-CN':'/','x-default':'/'}}}
export default async function Page(){
 let posts=demoPosts,books=[],bookCount=0,trails=[],content={},aboutText=DEFAULT_ABOUT_TEXT,showStudio=false
 if(isConfigured()){
  const db=await createClient()
  const [postResult,bookResult,trailResult,{data:site},{data:about},admin]=await Promise.all([
   db.from('posts').select('*').eq('status','published').order('published_at',{ascending:false}),
   db.from('books').select('id,title,author,cover_url,status,rating,language',{count:'exact'}).order('sort_order',{ascending:true}).order('created_at',{ascending:false}).limit(4),
   db.from('trails').select('id,slug,title,summary,updated_at,trail_items(id,item_type)').eq('status','published').order('updated_at',{ascending:false}).limit(3),
   db.from('site_content').select('value').eq('key','home').maybeSingle(),
   db.from('site_content').select('value').eq('key','about').maybeSingle(),
   getSiteAdmin(db)
  ])
  if(postResult.data?.length)posts=postResult.data
  books=bookResult.data||[]
  bookCount=bookResult.count||books.length
  trails=trailResult.data||[]
  content=site?.value||{}
  aboutText=resolveAboutText(about?.value||{},content)
  showStudio=Boolean(admin)
 }
 const schema={'@context':'https://schema.org','@type':'Blog','@id':`${SITE_URL}/#blog`,url:SITE_URL,name:SITE_NAME,description:SITE_DESCRIPTION,inLanguage:SITE_LANGUAGE,isPartOf:{'@id':WEBSITE_ID},blogPost:posts.slice(0,10).map(post=>({'@type':'BlogPosting',headline:post.title,description:post.excerpt,url:`${SITE_URL}/logs/${encodeURIComponent(post.slug)}`,datePublished:post.published_at}))}
 return <><StructuredData data={schema}/><HomeClient posts={posts} books={books} bookCount={bookCount} trails={trails} content={content} aboutText={aboutText} showStudio={showStudio}/></>
}
