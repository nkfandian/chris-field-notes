import HomeClient from './home-client'
import {demoPosts} from '@/lib/demo'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'
import StructuredData from './components/structured-data'
import {SITE_DESCRIPTION,SITE_LANGUAGE,SITE_NAME,SITE_URL,WEBSITE_ID} from '@/lib/seo'
import {DEFAULT_ABOUT_TEXT,resolveAboutText} from '@/lib/about'
export const dynamic='force-dynamic'
export const metadata={alternates:{canonical:'/',languages:{'zh-CN':'/','x-default':'/'}}}
export default async function Page(){let posts=demoPosts,content={},aboutText=DEFAULT_ABOUT_TEXT,showStudio=false;if(isConfigured()){const db=await createClient();const [{data},{data:site},{data:about},admin]=await Promise.all([db.from('posts').select('*').eq('status','published').order('published_at',{ascending:false}),db.from('site_content').select('value').eq('key','home').maybeSingle(),db.from('site_content').select('value').eq('key','about').maybeSingle(),getSiteAdmin(db)]);if(data?.length)posts=data;content=site?.value||{};aboutText=resolveAboutText(about?.value||{},content);showStudio=Boolean(admin)}const schema={'@context':'https://schema.org','@type':'Blog','@id':`${SITE_URL}/#blog`,url:SITE_URL,name:SITE_NAME,description:SITE_DESCRIPTION,inLanguage:SITE_LANGUAGE,isPartOf:{'@id':WEBSITE_ID},blogPost:posts.slice(0,10).map(post=>({'@type':'BlogPosting',headline:post.title,description:post.excerpt,url:`${SITE_URL}/logs/${encodeURIComponent(post.slug)}`,datePublished:post.published_at}))};return <><StructuredData data={schema}/><HomeClient posts={posts} content={content} aboutText={aboutText} showStudio={showStudio}/></>}
