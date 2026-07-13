import {createAdminClient} from '@/lib/supabase/admin'

export async function POST(request){try{const {token}=await request.json();if(!token)return Response.json({error:'invalid token'},{status:400});const db=createAdminClient();const {data,error}=await db.from('subscribers').update({status:'unsubscribed',updated_at:new Date().toISOString()}).eq('manage_token',token).select('id').maybeSingle();if(error)throw error;return Response.json({ok:Boolean(data)})}catch{return Response.json({error:'暂时无法退订'},{status:500})}}
