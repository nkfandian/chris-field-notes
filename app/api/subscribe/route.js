import {createAdminClient} from '@/lib/supabase/admin'
import {cleanText,clientKey,enforceRateLimit,jsonMutationGuard,parseJsonBody,subjectKey,validEmail} from '@/lib/security'

// 单次确认：提交邮箱即生效，不发送确认邮件。退订入口在每封邮件底部。
export async function POST(request){
 try{
  const blocked=jsonMutationGuard(request,2048);if(blocked)return blocked
  const parsed=await parseJsonBody(request,2048);if(parsed.response)return parsed.response
  const body=parsed.data;if(!body||typeof body!=='object'||Array.isArray(body))return Response.json({error:'请求格式无效。'},{status:400})
  const ok={ok:true,message:'订阅成功。新日志发布时会发送到这个邮箱。'}
  if(body.website)return Response.json(ok)
  const email=cleanText(body.email,160).toLowerCase();if(!validEmail(email))return Response.json({error:'请输入有效邮箱。'},{status:400})
  const db=createAdminClient()
  if(!await enforceRateLimit(db,clientKey(request,'subscribe'),3,3600))return Response.json({error:'请求过于频繁，请稍后再试。'},{status:429})
  if(!await enforceRateLimit(db,subjectKey(email,'subscribe-email'),2,86400))return Response.json({error:'该邮箱请求过于频繁，请稍后再试。'},{status:429})
  const now=new Date().toISOString()
  const {data:existing,error:readError}=await db.from('subscribers').select('id,status,verified_at').eq('email',email).maybeSingle()
  if(readError)throw readError
  if(!existing){
   const {error}=await db.from('subscribers').insert({email,source:'website',status:'active',verified_at:now})
   if(error&&error.code!=='23505')throw error
  }else if(existing.status!=='active'||!existing.verified_at){
   const {error}=await db.from('subscribers').update({status:'active',verified_at:now,updated_at:now}).eq('id',existing.id)
   if(error)throw error
  }
  return Response.json(ok)
 }catch(error){console.error('subscribe failed',error);return Response.json({error:'暂时无法订阅，请稍后再试。'},{status:500})}
}
