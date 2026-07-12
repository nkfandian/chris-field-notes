import {redirect} from 'next/navigation'
import {createClient,isConfigured} from '@/lib/supabase/server'
import BookEditor from './book-editor'
import '../studio.css'
import './book-editor.css'
export const dynamic='force-dynamic'
export default async function BookEditorPage(){if(!isConfigured())return null;const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/studio');const [{data:books},{data:posts}]=await Promise.all([db.from('books').select('*').order('sort_order'),db.from('posts').select('slug,title').order('published_at',{ascending:false})]);return <BookEditor initialBooks={books||[]} posts={posts||[]}/>}
