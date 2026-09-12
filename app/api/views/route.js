import {createAdminClient} from '@/lib/supabase/admin'
import {cleanText,clientKey,enforceRateLimit,jsonMutationGuard,parseJsonBody} from '@/lib/security'

export async function POST(request){
 try{
  const blocked=jsonMutationGuard(request,1024)
  if(blocked)return blocked
  const parsed=await parseJsonBody(request,1024)
  if(parsed.response)return parsed.response
  const slug=cleanText(parsed.data?.slug,180).toLowerCase()
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return Response.json({error:'日志链接无效。'},{status:400})
  const db=createAdminClient()
  if(!await enforceRateLimit(db,clientKey(request,`post-view:${slug}`),24,3600))return Response.json({ok:true,counted:false},{headers:{'Cache-Control':'no-store'}})
  const {data,error}=await db.rpc('record_post_view',{p_post_slug:slug})
  if(error)throw error
  return Response.json({ok:true,counted:Number(data)>0},{headers:{'Cache-Control':'no-store'}})
 }catch(error){
  console.error('post view failed',error)
  return Response.json({error:'暂时无法记录浏览。'},{status:500,headers:{'Cache-Control':'no-store'}})
 }
}
