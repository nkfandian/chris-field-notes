import {redirect} from 'next/navigation'
import {createClient,isConfigured} from '@/lib/supabase/server'
import CommentModeration from './comment-moderation'
import {getSiteAdmin} from '@/lib/auth'
import {markStudioSeen} from '@/lib/studio-badges'
import '../studio.css'
import './moderation.css'

export const dynamic='force-dynamic'

export default async function CommentsPage(){
 if(!isConfigured())return null
 const db=await createClient()
 if(!await getSiteAdmin(db))redirect('/studio')
 const [{data:comments},{data:posts}]=await Promise.all([
  db.from('comments').select('*').order('created_at',{ascending:false}),
  db.from('posts').select('slug,title'),
 ])
 // 进页面即视为已看：导航栏的互动审核气泡清零。
 await markStudioSeen(db,'comments')
 const titles={}
 for(const post of posts||[])titles[post.slug]=post.title
 return <CommentModeration initial={comments||[]} posts={titles}/>
}
