import HomeClient from './home-client'
import {demoPosts} from '@/lib/demo'
import {createClient,isConfigured} from '@/lib/supabase/server'
export const revalidate=60
export default async function Page(){let posts=demoPosts;if(isConfigured()){const db=await createClient();const {data}=await db.from('posts').select('*').eq('status','published').order('published_at',{ascending:false});if(data?.length)posts=data}return <HomeClient posts={posts}/>} 
