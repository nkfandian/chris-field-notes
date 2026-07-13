import {redirect} from 'next/navigation'
import {createClient,isConfigured} from '@/lib/supabase/server'
import TrailEditor from './trail-editor'
import '../studio.css'
import './trails-editor.css'
export const dynamic='force-dynamic'
export default async function TrailEditorPage(){if(!isConfigured())return null;const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/studio');const [{data:trails},{data:items},{data:posts},{data:books}]=await Promise.all([db.from('trails').select('*').order('updated_at',{ascending:false}),db.from('trail_items').select('*').order('position'),db.from('posts').select('slug,title').order('published_at',{ascending:false}),db.from('books').select('id,title,author').order('sort_order')]);return <TrailEditor initialTrails={trails||[]} initialItems={items||[]} posts={posts||[]} books={books||[]}/>} 
