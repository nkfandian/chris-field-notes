import {createAdminClient} from '@/lib/supabase/admin'
import {requestTooLarge,validUuid} from '@/lib/security'

export async function POST(request){try{if(requestTooLarge(request,2048))return Response.json({error:'请求过大'},{status:413});const {token}=await request.json();if(!validUuid(token))return Response.json({error:'invalid token'},{status:400});const db=createAdminClient();const {data,error}=await db.from('subscribers').update({status:'unsubscribed',manage_token:crypto.randomUUID(),updated_at:new Date().toISOString()}).eq('manage_token',token).select('id').maybeSingle();if(error)throw error;return Response.json({ok:Boolean(data)})}catch{return Response.json({error:'暂时无法退订'},{status:500})}}
