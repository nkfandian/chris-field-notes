import {redirect} from 'next/navigation'
import {createPublicClient,isConfigured} from '@/lib/supabase/server'
import {demoPosts} from '@/lib/demo'

export const dynamic='force-dynamic'

export async function GET(){
 let slugs=demoPosts.map(p=>p.slug)
 if(isConfigured()){
  const db=createPublicClient()
  const {data}=await db.from('posts').select('slug').eq('status','published')
  if(data?.length)slugs=data.map(row=>row.slug)
 }
 const pick=slugs[Math.floor(Math.random()*slugs.length)]||'formidable'
 redirect(`/logs/${encodeURIComponent(pick)}`)
}
