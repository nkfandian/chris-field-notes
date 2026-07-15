import {createClient} from '@/lib/supabase/server'
import {deliverPending} from '@/lib/notifications'
import {getSiteAdmin} from '@/lib/auth'
import {cleanText,jsonMutationGuard,parseJsonBody,validUuid} from '@/lib/security'
import {notifyIndexNow} from '@/lib/indexnow'
import {revalidatePath} from 'next/cache'

export async function POST(request){
 const blocked=jsonMutationGuard(request,262144)
 if(blocked)return blocked
 const db=await createClient()
 const user=await getSiteAdmin(db)
 if(!user)return Response.json({error:'unauthorized'},{status:401})
 const parsed=await parseJsonBody(request,262144)
 if(parsed.response)return parsed.response
 const input=parsed.data
 if(!input||typeof input!=='object'||Array.isArray(input))return Response.json({error:'请求格式无效'},{status:400})
 const payload={title:cleanText(input.title,180),slug:cleanText(input.slug,180).toLowerCase(),domain:input.domain,excerpt:cleanText(input.excerpt,1000),body:String(input.body||'').slice(0,200000),thesis:cleanText(input.thesis,2000),tools:cleanText(input.tools,2000),status:input.status||'draft',published_at:input.published_at||new Date().toISOString().slice(0,10),updated_at:new Date().toISOString()}
 if(!payload.title||!payload.slug)return Response.json({error:'标题和链接不能为空'},{status:400})
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug)||!['decode','execute','deploy','trek','roots'].includes(payload.domain)||!['draft','published'].includes(payload.status)||!/^\d{4}-\d{2}-\d{2}$/.test(payload.published_at)||input.id&&!validUuid(input.id))return Response.json({error:'文章字段格式无效'},{status:400})
 let query=input.id?db.from('posts').update(payload).eq('id',input.id):db.from('posts').insert(payload)
 const {data:post,error}=await query.select('*').single()
 if(error)return Response.json({error:error.message},{status:400})
 let notification=null
 let indexing=null
 if(post.status==='published'&&!post.notification_sent_at){
  try{notification=await deliverPending({postIds:[post.id]})}catch(error){notification={error:error.message}}
 }
 revalidatePath(`/logs/${post.slug}`)
 revalidatePath('/logs')
 revalidatePath('/')
 if(post.status==='published'||input.id){
  try{indexing=await notifyIndexNow([`/logs/${encodeURIComponent(post.slug)}`,'/logs','/'])}catch(error){indexing={accepted:false,error:error.message}}
 }
 return Response.json({post,notification,indexing})
}
