import {createAdminClient} from '@/lib/supabase/admin'
import {createClient as createServerClient,isConfigured} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'
import {cleanText,jsonMutationGuard,parseJsonBody} from '@/lib/security'
import {idempotencyKey,sendEmail} from '@/lib/resend'
import {buildReplyEmail} from '@/lib/comment-reply'
import {revalidatePath} from 'next/cache'

// 后台评论审核统一走服务端：service role 不受浏览器会话与 RLS 影响，
// 通过 / 拒绝只做单向状态迁移，重复点击是 no-op，不会再产生重复公开。
const REPLY_FROM=process.env.COMMENTS_FROM||'Chris <comments@chrisreading.ink>'
const revalidatePost=slug=>{if(slug)try{revalidatePath(`/logs/${slug}`)}catch{}}

export async function POST(request){
 try{
  if(!isConfigured())return Response.json({error:'服务未配置。'},{status:500})
  const blocked=jsonMutationGuard(request,8192);if(blocked)return blocked
  const parsed=await parseJsonBody(request,8192);if(parsed.response)return parsed.response
  const input=parsed.data;if(!input||typeof input!=='object'||Array.isArray(input))return Response.json({error:'请求格式无效。'},{status:400})
  const db=await createServerClient()
  if(!await getSiteAdmin(db))return Response.json({error:'需要管理员登录。'},{status:401})
  const admin=createAdminClient()
  const {action,id}=input
  if(typeof id!=='string'||!id)return Response.json({error:'缺少评论。'},{status:400})
  const {data:row,error:rowError}=await admin.from('comments').select('*').eq('id',id).maybeSingle()
  if(rowError)throw rowError
  if(!row)return Response.json({error:'评论不存在。'},{status:404})
  const now=new Date().toISOString()
  if(action==='approve'){
   if(row.status==='approved')return Response.json({ok:true,already:true,status:'approved'})
   const {error}=await admin.from('comments').update({status:'approved',reviewed_at:now}).eq('id',id).in('status',['pending','rejected'])
   if(error)throw error
   revalidatePost(row.post_slug)
   return Response.json({ok:true,status:'approved'})
  }
  if(action==='reject'){
   if(row.status==='rejected')return Response.json({ok:true,already:true,status:'rejected'})
   const {error}=await admin.from('comments').update({status:'rejected',reviewed_at:now}).eq('id',id).in('status',['pending','approved'])
   if(error)throw error
   revalidatePost(row.post_slug)
   return Response.json({ok:true,status:'rejected'})
  }
  if(action==='delete'){
   const {error}=await admin.from('comments').delete().eq('id',id)
   if(error)throw error
   revalidatePost(row.post_slug)
   return Response.json({ok:true,deleted:true})
  }
  if(action==='reply'){
   if(row.parent_id)return Response.json({error:'只能回复主评论。'},{status:400})
   if(row.status==='rejected')return Response.json({error:'已拒绝的评论不能回复。'},{status:400})
   const body=cleanText(input.body,2000)
   if(body.length<2)return Response.json({error:'回复内容至少 2 个字。'},{status:400})
   let parentApproved=row.status==='approved'
   if(row.status==='pending'){
    const {error}=await admin.from('comments').update({status:'approved',reviewed_at:now}).eq('id',id).eq('status','pending')
    if(error)throw error
    parentApproved=true
   }
   let postTitle=''
   if(row.post_slug){
    const {data:post}=await admin.from('posts').select('title').eq('slug',row.post_slug).maybeSingle()
    postTitle=post?.title||row.post_slug
   }
   const {data:reply,error:insertError}=await admin.from('comments').insert({kind:row.kind,post_slug:row.post_slug,parent_id:row.id,name:'Chris',email:'comments@chrisreading.ink',body,status:'approved'}).select('*').single()
   if(insertError)throw insertError
   revalidatePost(row.post_slug)
   const email=buildReplyEmail({name:row.name,postTitle,postSlug:row.post_slug,original:row.body,reply:body})
   const sent=await sendEmail({from:REPLY_FROM,to:[row.email],subject:email.subject,text:email.text,html:email.html},idempotencyKey('comment-reply',reply.id))
   return Response.json({ok:true,reply,parentApproved,emailSent:sent.ok,emailError:sent.ok?'':sent.error})
  }
  return Response.json({error:'未知操作。'},{status:400})
 }catch(error){
  console.error('comment moderation failed',error)
  return Response.json({error:'暂时无法处理，请稍后再试。'},{status:500})
 }
}
