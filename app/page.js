import HomeClient from './home-client'
import {demoPosts} from '@/lib/demo'
import {createClient,isConfigured} from '@/lib/supabase/server'
export const revalidate=60
export default async function Page(){let posts=demoPosts,content={};if(isConfigured()){const db=await createClient();const [{data},{data:site}]=await Promise.all([db.from('posts').select('*').eq('status','published').order('published_at',{ascending:false}),db.from('site_content').select('value').eq('key','home').maybeSingle()]);if(data?.length)posts=data;content=site?.value||{}}return <HomeClient posts={posts} content={content}/>} 
