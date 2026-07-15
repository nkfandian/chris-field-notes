import HomeClient from './home-client'
import {demoPosts} from '@/lib/demo'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'
export const dynamic='force-dynamic'
export default async function Page(){let posts=demoPosts,content={},showStudio=false;if(isConfigured()){const db=await createClient();const [{data},{data:site},admin]=await Promise.all([db.from('posts').select('*').eq('status','published').order('published_at',{ascending:false}),db.from('site_content').select('value').eq('key','home').maybeSingle(),getSiteAdmin(db)]);if(data?.length)posts=data;content=site?.value||{};showStudio=Boolean(admin)}return <HomeClient posts={posts} content={content} showStudio={showStudio}/>}
