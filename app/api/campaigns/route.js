import {createAdminClient} from '@/lib/supabase/admin'
import {createClient as createSessionClient} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'
import {cleanText,jsonMutationGuard,parseJsonBody} from '@/lib/security'
import {emailPreview} from '@/lib/email-preview'
import {SITE_URL,articleHeader,ctaButton,emailShell,postBodyHtml,unsubscribeLink} from '@/lib/email-template'
import {allRows} from '@/lib/notifications'
import {RESEND_BATCH_SIZE,idempotencyKey,sendEmailBatch} from '@/lib/resend'
// 手动群发：与新日志邮件共用模板（纸靛蓝色板、手机端日志页版式）。
function html(subject,body,token){
 const date=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'})
 const inner=articleHeader({title:subject,date})+postBodyHtml(body)+ctaButton(SITE_URL,'访问网站 →')
 return emailShell({preheader:emailPreview(body),inner,unsubscribeUrl:unsubscribeLink(token)})
}
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
