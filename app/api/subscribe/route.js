import {createAdminClient} from '@/lib/supabase/admin'
import {cleanText,clientKey,enforceRateLimit,jsonMutationGuard,parseJsonBody,subjectKey,validEmail} from '@/lib/security'

const site='https://www.chrisreading.ink'
function confirmHtml(url){return `<!doctype html><html><body style="margin:0;background:#efeee8;color:#151713"><div style="max-width:620px;margin:auto;padding:48px 24px"><img src="${site}/field-notes-mark.png" width="46" height="46" alt=""><p style="font:11px monospace;letter-spacing:.12em">CHRIS / FIELD NOTES</p><h1 style="margin:48px 0 18px;font:700 38px/1.2 Georgia,'Noto Serif SC',serif">确认订阅</h1><p style="font:17px/1.8 Georgia,'Noto Serif SC',serif;color:#696d65">请确认这是你本人提交的邮箱。确认后，新的日志完成时才会发送给你。</p><a href="${url}" style="display:inline-block;margin-top:24px;padding:14px 20px;background:#151713;color:#efeee8;text-decoration:none;font:11px monospace">确认订阅 →</a><p style="margin-top:52px;border-top:1px solid #151713;padding-top:14px;font:10px/1.7 monospace;color:#696d65">如果你没有订阅，可以忽略这封邮件。</p></div></body></html>`}

export async function POST(request){
 try{
  const blocked=jsonMutationGuard(request,2048);if(blocked)return blocked
  const parsed=await parseJsonBody(request,2048);if(parsed.response)return parsed.response
  const body=parsed.data;if(!body||typeof body!=='object'||Array.isArray(body))return Response.json({error:'请求格式无效。'},{status:400})
  if(body.website)return Response.json({ok:true})
  const email=cleanText(body.email,160).toLowerCase();if(!validEmail(email))return Response.json({error:'请输入有效邮箱。'},{status:400})
  const db=createAdminClient()
  if(!await enforceRateLimit(db,clientKey(request,'subscribe'),3,3600))return Response.json({error:'请求过于频繁，请稍后再试。'},{status:429})
  if(!await enforceRateLimit(db,subjectKey(email,'subscribe-email'),2,86400))return Response.json({error:'该邮箱请求过于频繁，请稍后再试。'},{status:429})
  const {data:existing}=await db.from('subscribers').select('id,status,verified_at,confirmation_token,confirmation_sent_at').eq('email',email).maybeSingle()
  const generic={ok:true,message:'如果该邮箱尚未完成订阅，确认邮件将很快送达。'}
  if(existing?.status==='active'&&existing.verified_at)return Response.json(generic,{status:202})
  if(existing?.confirmation_sent_at&&Date.now()-new Date(existing.confirmation_sent_at).getTime()<15*60*1000)return Response.json(generic,{status:202})
  let subscriber=existing
  if(!subscriber){const {data,error}=await db.from('subscribers').insert({email,source:'website',status:'pending'}).select('id,confirmation_token').single();if(error)throw error;subscriber=data}
  else if(subscriber.status==='unsubscribed'){const confirmation_token=crypto.randomUUID();const {data,error}=await db.from('subscribers').update({status:'pending',verified_at:null,confirmation_token,updated_at:new Date().toISOString()}).eq('id',subscriber.id).select('id,confirmation_token').single();if(error)throw error;subscriber=data}
  const confirmUrl=`${site}/subscribe/confirm?token=${encodeURIComponent(subscriber.confirmation_token)}`
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${process.env.RESEND_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({from:process.env.NOTIFICATION_FROM,to:[email],subject:'确认订阅｜CHRIS / FIELD NOTES',html:confirmHtml(confirmUrl)})})
  if(!response.ok)throw new Error(await response.text())
  await db.from('subscribers').update({confirmation_sent_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',subscriber.id)
  return Response.json(generic,{status:202})
 }catch(error){console.error('subscribe failed',error);return Response.json({error:'暂时无法订阅，请稍后再试。'},{status:500})}
}
