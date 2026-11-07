import {redirect} from 'next/navigation'
import {createClient,isConfigured} from '@/lib/supabase/server'
import CommentModeration from './comment-moderation'
import {getSiteAdmin} from '@/lib/auth'
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
 const titles={}
 for(const post of posts||[])titles[post.slug]=post.title
 return <CommentModeration initial={comments||[]} posts={titles}/>
}
