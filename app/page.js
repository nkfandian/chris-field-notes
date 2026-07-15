import HomeClient from './home-client'
import {demoPosts} from '@/lib/demo'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'
import StructuredData from './components/structured-data'
import {SITE_DESCRIPTION,SITE_LANGUAGE,SITE_NAME,SITE_URL,WEBSITE_ID} from '@/lib/seo'
export const dynamic='force-dynamic'
export const metadata={alternates:{canonical:'/',languages:{'zh-CN':'/','x-default':'/'}}}
export default async function Page(){let posts=demoPosts,content={},showStudio=false;if(isConfigured()){const db=await createClient();const [{data},{data:site},admin]=await Promise.all([db.from('posts').select('*').eq('status','published').order('published_at',{ascending:false}),db.from('site_content').select('value').eq('key','home').maybeSingle(),getSiteAdmin(db)]);if(data?.length)posts=data;content=site?.value||{};showStudio=Boolean(admin)}const schema={'@context':'https://schema.org','@type':'Blog','@id':`${SITE_URL}/#blog`,url:SITE_URL,name:SITE_NAME,description:SITE_DESCRIPTION,inLanguage:SITE_LANGUAGE,isPartOf:{'@id':WEBSITE_ID},blogPost:posts.slice(0,10).map(post=>({'@type':'BlogPosting',headline:post.title,description:post.excerpt,url:`${SITE_URL}/logs/${encodeURIComponent(post.slug)}`,datePublished:post.published_at}))};return <><StructuredData data={schema}/><HomeClient posts={posts} content={content} showStudio={showStudio}/></>}
