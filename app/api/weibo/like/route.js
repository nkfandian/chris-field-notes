import {createAdminClient} from '@/lib/supabase/admin'
import {clientKey,enforceRateLimit,jsonMutationGuard,parseJsonBody,validUuid} from '@/lib/security'
import {incrementWeiboLike} from '@/lib/weibo'
import {revalidatePath} from 'next/cache'

export async function POST(request){
 try{
  const blocked=jsonMutationGuard(request,1024)
  if(blocked)return blocked
  const parsed=await parseJsonBody(request,1024)
  if(parsed.response)return parsed.response
  const id=parsed.data?.id
  if(!validUuid(id))return Response.json({error:'微博标识无效。'},{status:400})
  const db=createAdminClient()
  if(!await enforceRateLimit(db,clientKey(request,'weibo-like-global'),30,3600))return Response.json({error:'操作过于频繁，请稍后再试。'},{status:429,headers:{'Cache-Control':'no-store'}})
  if(!await enforceRateLimit(db,clientKey(request,`weibo-like:${id}`),1,86400))return Response.json({ok:true,counted:false},{headers:{'Cache-Control':'no-store'}})
  const likes=await incrementWeiboLike(id)
  if(likes===null)return Response.json({error:'微博不存在。'},{status:404,headers:{'Cache-Control':'no-store'}})
  revalidatePath('/weibo')
  revalidatePath('/')
  return Response.json({ok:true,counted:true,likes},{headers:{'Cache-Control':'no-store'}})
 }catch(error){
  console.error('weibo like failed',error)
  return Response.json({error:'暂时无法点赞。'},{status:500,headers:{'Cache-Control':'no-store'}})
 }
}
