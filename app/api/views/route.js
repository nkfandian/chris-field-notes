import {createAdminClient} from '@/lib/supabase/admin'
import {cleanText,clientKey,enforceRateLimit,jsonMutationGuard,parseJsonBody} from '@/lib/security'

function isMissingWeiboViewTarget(error){
 const code=String(error?.code||'')
 const msg=String(error?.message||'')
 return code==='PGRST202'||code==='42883'||code==='42P01'||code==='PGRST205'
  ||/record_weibo_view|weibo_views|weibo_view_days|does not exist|could not find/i.test(msg)
}

export async function POST(request){
 try{
  const blocked=jsonMutationGuard(request,1024)
  if(blocked)return blocked
  const parsed=await parseJsonBody(request,1024)
  if(parsed.response)return parsed.response
  const slug=cleanText(parsed.data?.slug,180)
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug))return Response.json({error:'日志链接无效。'},{status:400})
  const db=createAdminClient()
  const isWeibo=slug.toLowerCase().startsWith('weibo-')
  if(isWeibo){
   if(!await enforceRateLimit(db,clientKey(request,`weibo-view-once:${slug.toLowerCase()}`),1,315360000))return Response.json({ok:true,counted:false},{headers:{'Cache-Control':'no-store'}})
  }else if(!await enforceRateLimit(db,clientKey(request,`post-view:${slug.toLowerCase()}`),24,3600))return Response.json({ok:true,counted:false},{headers:{'Cache-Control':'no-store'}})
  const {data,error}=await db.rpc(isWeibo?'record_weibo_view':'record_post_view',isWeibo?{p_weibo_slug:slug}:{p_post_slug:slug})
  if(error){
   if(isWeibo&&isMissingWeiboViewTarget(error))return Response.json({ok:true,counted:false},{headers:{'Cache-Control':'no-store'}})
   throw error
  }
  return Response.json({ok:true,counted:Number(data)>0},{headers:{'Cache-Control':'no-store'}})
 }catch(error){
  console.error('post view failed',error)
  return Response.json({error:'暂时无法记录浏览。'},{status:500,headers:{'Cache-Control':'no-store'}})
 }
}
