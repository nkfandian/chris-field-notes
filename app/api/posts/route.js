import {createClient} from '@/lib/supabase/server'
import {deliverPending} from '@/lib/notifications'

export async function POST(request){
 const db=await createClient()
 const {data:{user}}=await db.auth.getUser()
 if(!user)return Response.json({error:'unauthorized'},{status:401})
 const input=await request.json()
 const payload={title:String(input.title||'').trim(),slug:String(input.slug||'').trim(),domain:input.domain,excerpt:input.excerpt||'',body:input.body||'',thesis:input.thesis||'',tools:input.tools||'',status:input.status||'draft',published_at:input.published_at||new Date().toISOString().slice(0,10),updated_at:new Date().toISOString()}
 if(!payload.title||!payload.slug)return Response.json({error:'标题和链接不能为空'},{status:400})
 let query=input.id?db.from('posts').update(payload).eq('id',input.id):db.from('posts').insert(payload)
 const {data:post,error}=await query.select('*').single()
 if(error)return Response.json({error:error.message},{status:400})
 let notification=null
 if(post.status==='published'&&!post.notification_sent_at){
  try{notification=await deliverPending({postIds:[post.id]})}catch(error){notification={error:error.message}}
 }
 return Response.json({post,notification})
}
