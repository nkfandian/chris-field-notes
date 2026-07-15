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
  const {data,error}=await db.from('subscribers').update({status:'active',verified_at:new Date().toISOString(),confirmation_token:crypto.randomUUID(),updated_at:new Date().toISOString()}).eq('confirmation_token',token).eq('status','pending').select('id').maybeSingle()
  if(error)throw error
  return Response.json({ok:Boolean(data)},{status:data?200:400,headers:{'Cache-Control':'no-store'}})
 }catch(error){console.error('subscription confirmation failed',error);return Response.json({ok:false},{status:500})}
}
