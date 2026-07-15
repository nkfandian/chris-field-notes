import {createAdminClient} from '@/lib/supabase/admin'
import {requestTooLarge,validUuid} from '@/lib/security'

export async function POST(request){
 try{
  if(requestTooLarge(request,2048))return Response.json({error:'请求过大'},{status:413})
  const {token}=await request.json()
  if(!validUuid(token))return Response.json({ok:false},{status:400})
  const db=createAdminClient()
  const {data,error}=await db.from('subscribers').update({status:'active',verified_at:new Date().toISOString(),confirmation_token:crypto.randomUUID(),updated_at:new Date().toISOString()}).eq('confirmation_token',token).eq('status','pending').select('id').maybeSingle()
  if(error)throw error
  return Response.json({ok:Boolean(data)},{status:data?200:400})
 }catch(error){console.error('subscription confirmation failed',error);return Response.json({ok:false},{status:500})}
}
