import {createAdminClient} from '@/lib/supabase/admin'
import {createClient as createSessionClient} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'
import {cleanText,jsonMutationGuard,parseJsonBody} from '@/lib/security'
import {emailPreview,preheaderHtml} from '@/lib/email-preview'
import {allRows} from '@/lib/notifications'
import {RESEND_BATCH_SIZE,idempotencyKey,sendEmailBatch} from '@/lib/resend'
function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function html(subject,body,token){const content=esc(body).split(/\n\s*\n/).filter(Boolean).map(p=>`<p style="margin:0 0 22px;font:17px/1.9 Georgia,'Noto Serif SC',serif">${p.replace(/\n/g,'<br>')}</p>`).join(''),logo='https://www.chrisreading.ink/field-notes-mark.png',unsubscribe=`https://www.chrisreading.ink/unsubscribe?token=${encodeURIComponent(token||'')}`,preview=emailPreview(body);return `<!doctype html><html><body style="margin:0;background:#efeee8;color:#151713">${preheaderHtml(preview)}<div style="max-width:720px;margin:auto;padding:42px 24px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-bottom:1px solid #151713;padding-bottom:14px"><tr><td width="46"><img src="${logo}" width="38" height="38" alt="" style="display:block;border:0;border-radius:7px"></td><td style="font:11px monospace;letter-spacing:.12em"><b>FIELD NOTES</b></td></tr></table><h1 style="margin:54px 0 34px;font:700 44px/1.15 Georgia,'Noto Serif SC',serif;letter-spacing:-.04em">${esc(subject)}</h1><div style="border-top:1px solid #b9b9b2;padding-top:34px">${content}</div><a href="https://www.chrisreading.ink" style="display:inline-block;margin-top:28px;padding:13px 18px;background:#151713;color:#efeee8;text-decoration:none;font:11px monospace">返回网站</a><div style="margin-top:60px;border-top:1px solid #151713;padding-top:14px;font:10px/1.7 monospace;color:#696d65">你收到此邮件，是因为订阅了 CHRIS / FIELD NOTES。　<a href="${unsubscribe}" style="color:#696d65">管理或取消订阅</a></div></div></body></html>`}
export async function POST(request){
 const blocked=jsonMutationGuard(request,32768);if(blocked)return blocked
 const session=await createSessionClient();const user=await getSiteAdmin(session)
 if(!user)return Response.json({error:'unauthorized'},{status:401})
 const parsed=await parseJsonBody(request,32768);if(parsed.response)return parsed.response
 const input=parsed.data;if(!input||typeof input!=='object'||Array.isArray(input))return Response.json({error:'请求格式无效'},{status:400})
 const subject=cleanText(input.subject,160),body=cleanText(input.body,20000)
 if(!subject||!body)return Response.json({error:'主题和正文不能为空'},{status:400})
 const db=createAdminClient()
 let subscribers
 try{subscribers=await allRows(()=>db.from('subscribers').select('id,email,manage_token').eq('status','active').not('verified_at','is',null).order('created_at').order('id'))}
 catch{return Response.json({error:'无法读取订阅用户'},{status:500})}
 const {data:campaign}=await db.from('email_campaigns').insert({subject,body,recipient_count:subscribers.length,created_by:user.id}).select('id').single()
 const campaignId=campaign?.id||crypto.randomUUID()
 let sent=0,failed=0,lastError=''
 // 按 100 封一批发送，避免逐封请求触发限流或函数超时。
 for(let start=0;start<subscribers.length;start+=RESEND_BATCH_SIZE){
  const chunk=subscribers.slice(start,start+RESEND_BATCH_SIZE)
  const results=await sendEmailBatch(chunk.map(subscriber=>({
   message:{from:process.env.NOTIFICATION_FROM,to:[subscriber.email],subject,text:body,html:html(subject,body,subscriber.manage_token)},
   key:idempotencyKey('campaign',campaignId,subscriber.id)
  })),idempotencyKey('campaign',campaignId,start))
  for(const result of results){if(result.ok)sent++;else{failed++;lastError=result.error||'邮件服务拒绝了部分发送请求'}}
 }
 if(campaign)await db.from('email_campaigns').update({status:failed?(sent?'partial':'failed'):'sent',error:lastError,sent_at:new Date().toISOString()}).eq('id',campaign.id)
 return Response.json({sent,failed},{headers:{'Cache-Control':'no-store'}})
}
