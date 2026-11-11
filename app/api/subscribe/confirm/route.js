import {createAdminClient} from '@/lib/supabase/admin'
import {clientKey,enforceRateLimit,jsonMutationGuard,parseJsonBody,validUuid} from '@/lib/security'

export async function POST(request){
 try{
  const blocked=jsonMutationGuard(request,2048);if(blocked)return blocked
  const parsed=await parseJsonBody(request,2048);if(parsed.response)return parsed.response
  const body=parsed.data;if(!body||typeof body!=='object'||Array.isArray(body))return Response.json({ok:false},{status:400})
  const {token}=body
  if(!validUuid(token))return Response.json({ok:false},{status:400})
  const db=createAdminClient()
  if(!await enforceRateLimit(db,clientKey(request,'subscribe-confirm'),20,3600))return Response.json({ok:false},{status:429})
  const now=new Date().toISOString()
  const changes={status:'active',verified_at:now,confirmation_token:crypto.randomUUID(),confirmation_sent_at:null,updated_at:now}
  const {data,error}=await db.from('subscribers').update(changes).eq('confirmation_token',token).eq('status','pending').select('id').maybeSingle()
  if(error)throw error
  let restored=null
  if(!data){
   const result=await db.from('subscribers').update(changes).eq('confirmation_token',token).eq('status','unsubscribed').gte('confirmation_sent_at',new Date(Date.now()-86400000).toISOString()).select('id').maybeSingle()
   if(result.error)throw result.error
   restored=result.data
  }
  // 改为单次确认后，旧确认邮件里的链接可能指向已生效的订阅。
  let active=Boolean(data||restored)
  if(!active){const {data:current}=await db.from('subscribers').select('id').eq('confirmation_token',token).eq('status','active').maybeSingle();active=Boolean(current)}
  return Response.json({ok:active},{status:active?200:400,headers:{'Cache-Control':'no-store'}})
 }catch(error){console.error('subscription confirmation failed',error);return Response.json({ok:false},{status:500})}
}
