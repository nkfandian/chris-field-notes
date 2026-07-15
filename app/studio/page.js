import Studio from './studio'
import './studio.css'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {demoPosts} from '@/lib/demo'
import {getSiteAdmin} from '@/lib/auth'
export default async function StudioPage(){let user=null,posts=demoPosts;if(isConfigured()){const db=await createClient();user=await getSiteAdmin(db);if(user){const res=await db.from('posts').select('*').order('updated_at',{ascending:false});posts=res.data||[]}}return <Studio configured={isConfigured()} initialUser={user?{email:user.email}:null} initialPosts={posts}/>}
