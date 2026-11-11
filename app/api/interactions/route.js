import {createAdminClient} from '@/lib/supabase/admin'
import {cleanText,clientKey,enforceRateLimit,jsonMutationGuard,parseJsonBody,subjectKey,validEmail} from '@/lib/security'

export async function POST(request){
 try{
  const blocked=jsonMutationGuard(request,8192);if(blocked)return blocked
  const parsed=await parseJsonBody(request,8192);if(parsed.response)return parsed.response
  const input=parsed.data;if(!input||typeof input!=='object'||Array.isArray(input))return Response.json({error:'请求格式无效。'},{status:400})
  if(input.website)return Response.json({ok:true})
  const kind=input.kind==='message'?'message':'comment'
  const payload={kind,post_slug:kind==='comment'?(cleanText(input.post_slug,180)||null):null,name:cleanText(input.name,60),email:cleanText(input.email,160).toLowerCase(),body:cleanText(input.body,2000),status:'pending'}
  if(!payload.name||payload.body.length<2||!validEmail(payload.email))return Response.json({error:'请完整填写称呼、邮箱和内容。'},{status:400})
  const db=createAdminClient()
  if(!await enforceRateLimit(db,clientKey(request,'interaction'),4,3600))return Response.json({error:'提交过于频繁，请稍后再试。'},{status:429})
  if(!await enforceRateLimit(db,subjectKey(payload.email,'interaction-email'),6,86400))return Response.json({error:'该邮箱提交过于频繁，请稍后再试。'},{status:429})
  if(payload.kind==='comment'){
   if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(payload.post_slug||''))return Response.json({error:'日志链接无效。'},{status:400})
   const {data:post}=await db.from('posts').select('id').eq('slug',payload.post_slug).eq('status','published').maybeSingle()
   if(!post)return Response.json({error:'日志不存在或尚未发布。'},{status:404})
  }
  const since=new Date(Date.now()-10*60*1000).toISOString()
  let dupQuery=db.from('comments').select('id').eq('kind',payload.kind).eq('email',payload.email).eq('body',payload.body).gte('created_at',since).limit(1)
  dupQuery=payload.post_slug?dupQuery.eq('post_slug',payload.post_slug):dupQuery.is('post_slug',null)
  const {data:dup}=await dupQuery.maybeSingle()
  if(dup)return Response.json({ok:true,duplicate:true})
  const {error}=await db.from('comments').insert(payload);if(error)throw error
  return Response.json({ok:true})
 }catch(error){console.error('interaction failed',error);return Response.json({error:'暂时无法提交，请稍后再试。'},{status:500})}
}
