import {createAdminClient} from '@/lib/supabase/admin'
import {cleanText,enforceRateLimit,requestTooLarge,validEmail} from '@/lib/security'

export async function POST(request){
 try{
  if(requestTooLarge(request,8192))return Response.json({error:'提交内容过大。'},{status:413})
  const db=createAdminClient();if(!await enforceRateLimit(db,request,'interaction',4,3600))return Response.json({error:'提交过于频繁，请稍后再试。'},{status:429})
  const input=await request.json();if(input.website)return Response.json({ok:true})
  const payload={kind:input.kind==='message'?'message':'comment',post_slug:cleanText(input.post_slug,180)||null,name:cleanText(input.name,60),email:cleanText(input.email,160).toLowerCase(),body:cleanText(input.body,2000),status:'pending'}
  if(!payload.name||payload.body.length<2||!validEmail(payload.email))return Response.json({error:'请完整填写称呼、邮箱和内容。'},{status:400})
  if(payload.kind==='comment'){
   if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(payload.post_slug||''))return Response.json({error:'日志链接无效。'},{status:400})
   const {data:post}=await db.from('posts').select('id').eq('slug',payload.post_slug).eq('status','published').maybeSingle()
   if(!post)return Response.json({error:'日志不存在或尚未发布。'},{status:404})
  }
  const {error}=await db.from('comments').insert(payload);if(error)throw error
  return Response.json({ok:true})
 }catch(error){console.error('interaction failed',error);return Response.json({error:'暂时无法提交，请稍后再试。'},{status:500})}
}
