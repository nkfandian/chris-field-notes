import Studio from './studio'
import './studio.css'
import './markdown-editor.css'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {demoPosts} from '@/lib/demo'
import {getSiteAdmin} from '@/lib/auth'
export default async function StudioPage(){let user=null,posts=demoPosts.map(post=>({...post,view_count:0}));if(isConfigured()){const db=await createClient();user=await getSiteAdmin(db);if(user){const [{data:postData},{data:viewData}]=await Promise.all([db.from('posts').select('*').order('updated_at',{ascending:false}),db.from('post_views').select('post_id,view_count')]);const views=new Map((viewData||[]).map(row=>[row.post_id,Number(row.view_count)||0]));posts=(postData||[]).map(post=>({...post,view_count:views.get(post.id)||0}))}}return <Studio configured={isConfigured()} initialUser={user?{email:user.email}:null} initialPosts={posts}/>}
