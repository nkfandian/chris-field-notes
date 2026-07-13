import Studio from './studio'
import Link from 'next/link'
import './studio.css'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {demoPosts} from '@/lib/demo'
export default async function StudioPage(){let user=null,posts=demoPosts;if(isConfigured()){const db=await createClient();const auth=await db.auth.getUser();user=auth.data.user;if(user){const res=await db.from('posts').select('*').order('updated_at',{ascending:false});posts=res.data||[]}}return <>{user&&<Link className="studio-audience-link" href="/studio/subscribers">订阅用户 / AUDIENCE →</Link>}<Studio configured={isConfigured()} initialUser={user?{email:user.email}:null} initialPosts={posts}/></>}
