import HomeClient from './home-client'
import {demoPosts} from '@/lib/demo'
import {createPublicClient,isConfigured} from '@/lib/supabase/server'
import StructuredData from './components/structured-data'
import {AUTHOR_ID,HOME_TITLE,PUBLISHER_ID,RSS_ALTERNATES,SITE_DESCRIPTION,SITE_LANGUAGE,SITE_NAME,SITE_URL,WEBSITE_ID,firstPostImage,ogImage,seoDescription} from '@/lib/seo'
export const revalidate=300
export const metadata={title:{absolute:HOME_TITLE},openGraph:{title:HOME_TITLE,description:SITE_DESCRIPTION,url:'/',siteName:SITE_NAME,type:'website',images:[{url:ogImage('面对复杂，保持欢喜'),width:1200,height:630,alt:SITE_NAME}]},twitter:{card:'summary_large_image',title:HOME_TITLE,description:SITE_DESCRIPTION,images:[ogImage('面对复杂，保持欢喜')]},alternates:{canonical:'/',languages:{'zh-CN':'/','x-default':'/'},types:RSS_ALTERNATES}}
export default async function Page(){
 let posts=demoPosts,schemaPosts=demoPosts,books=[],bookCount=0,trails=[],content={}
 if(isConfigured()){
  const db=createPublicClient()
  const [postResult,schemaResult,bookResult,trailResult,{data:site}]=await Promise.all([
   db.from('posts').select('id,slug,title,excerpt,domain,published_at,updated_at').eq('status','published').order('published_at',{ascending:false}),
   db.from('posts').select('slug,title,excerpt,domain,body,published_at,updated_at').eq('status','published').order('published_at',{ascending:false}).limit(10),
   db.from('books').select('id,title,author,cover_url,status,rating,language',{count:'exact'}).order('sort_order',{ascending:true}).order('created_at',{ascending:false}).limit(4),
   db.from('trails').select('id,slug,title,summary,updated_at,trail_items(id,item_type)').eq('status','published').order('updated_at',{ascending:false}).limit(3),
   db.from('site_content').select('value').eq('key','home').maybeSingle(),
   getSiteAdmin(db)
  ])
  if(postResult.data?.length)posts=postResult.data
  if(schemaResult.data?.length)schemaPosts=schemaResult.data
  else if(postResult.data?.length)schemaPosts=postResult.data.slice(0,10)
  books=bookResult.data||[]
  bookCount=bookResult.count||books.length
  trails=trailResult.data||[]
  content=site?.value||{}
 }
 const schema={'@context':'https://schema.org','@type':'Blog','@id':`${SITE_URL}/#blog`,url:SITE_URL,name:SITE_NAME,description:SITE_DESCRIPTION,inLanguage:SITE_LANGUAGE,isPartOf:{'@id':WEBSITE_ID},author:{'@id':AUTHOR_ID},publisher:{'@id':PUBLISHER_ID},blogPost:schemaPosts.slice(0,10).map(post=>{const url=`${SITE_URL}/logs/${encodeURIComponent(post.slug)}`,contentImage=firstPostImage(post.body),image=contentImage||ogImage(post.title);return {'@type':'BlogPosting','@id':`${url}#article`,headline:post.title,description:seoDescription(post.excerpt||post.body),url,image,datePublished:post.published_at,dateModified:post.updated_at||post.published_at,author:{'@id':AUTHOR_ID},publisher:{'@id':PUBLISHER_ID}}})}
 const listPosts=posts.map(({body,...post})=>post)
 return <><StructuredData data={schema}/><HomeClient posts={listPosts} books={books} bookCount={bookCount} trails={trails} content={content}/></>
}
