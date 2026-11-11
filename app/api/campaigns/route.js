import {createAdminClient} from '@/lib/supabase/admin'
import {createClient as createSessionClient} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'
import {cleanText,jsonMutationGuard,parseJsonBody,validUuid} from '@/lib/security'
import {emailPreview} from '@/lib/email-preview'
import {SITE_URL,articleHeader,ctaButton,emailShell,postBodyHtml,unsubscribeLink} from '@/lib/email-template'
import {allRows} from '@/lib/notifications'
import {RESEND_BATCH_SIZE,idempotencyKey,sendEmail} from '@/lib/resend'

const TABLE='email_campaign_deliveries'
const STALE_SENDING_MS=15*60*1000
const SENDS_PER_REQUEST=10

function html(subject,body,token){
 const date=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'})
 const inner=articleHeader({title:subject,date})+postBodyHtml(body)+ctaButton(SITE_URL,'访问网站 →')
 return emailShell({preheader:emailPreview(body),inner,unsubscribeUrl:unsubscribeLink(token)})
}

async function deliveryRows(db,campaignId){
 return allRows(()=>db.from(TABLE).select('subscriber_id,email,status,updated_at,error').eq('campaign_id',campaignId).order('subscriber_id'))
}

async function claimDeliveries(db,campaignId,ids,retryCutoff){
 const now=new Date().toISOString()
 const staleBefore=new Date(Date.now()-STALE_SENDING_MS).toISOString()
 const claimed=new Set()
 const pending=await db.from(TABLE).update({status:'sending',error:'',updated_at:now}).eq('campaign_id',campaignId).in('subscriber_id',ids).eq('status','pending').select('subscriber_id')
 if(pending.error)throw pending.error
 for(const row of pending.data||[])claimed.add(row.subscriber_id)
 if(retryCutoff){
  const failed=await db.from(TABLE).update({status:'sending',error:'',updated_at:now}).eq('campaign_id',campaignId).in('subscriber_id',ids).eq('status','failed').lt('updated_at',retryCutoff).select('subscriber_id')
  if(failed.error)throw failed.error
  for(const row of failed.data||[])claimed.add(row.subscriber_id)
 }
 const {data,error}=await db.from(TABLE).update({status:'sending',error:'',updated_at:now}).eq('campaign_id',campaignId).in('subscriber_id',ids).eq('status','sending').lt('updated_at',staleBefore).select('subscriber_id')
 if(error)throw error
 for(const row of data||[])claimed.add(row.subscriber_id)
 return claimed
}

async function finish(db,campaign,retryCutoff){
 const rows=await deliveryRows(db,campaign.id)
 const sent=rows.filter(row=>row.status==='sent').length
 const failed=rows.filter(row=>row.status==='failed').length
 const skipped=rows.filter(row=>row.status==='skipped').length
 const pending=rows.length-sent-failed-skipped
 const retryable=retryCutoff?rows.filter(row=>row.status==='failed'&&row.updated_at<retryCutoff).length:0
 const staleBefore=new Date(Date.now()-STALE_SENDING_MS).toISOString()
 const ready=rows.filter(row=>row.status==='pending'||row.status==='sending'&&row.updated_at<staleBefore||retryCutoff&&row.status==='failed'&&row.updated_at<retryCutoff).length
 const status=pending?'sending':failed?(sent?'partial':'failed'):'sent'
 const lastError=rows.find(row=>row.status==='failed')?.error||''
 const {error}=await db.from('email_campaigns').update({status,recipient_count:rows.length,error:lastError,...(pending?{}:{sent_at:new Date().toISOString()})}).eq('id',campaign.id)
 if(error)throw error
 return {campaignId:campaign.id,status,sent,failed,skipped,pending,retryable,ready,total:rows.length,retryCutoff}
}

export async function POST(request){
 const blocked=jsonMutationGuard(request,131072);if(blocked)return blocked
 const session=await createSessionClient()
 const user=await getSiteAdmin(session)
 if(!user)return Response.json({error:'unauthorized'},{status:401})
 const parsed=await parseJsonBody(request,131072);if(parsed.response)return parsed.response
 const input=parsed.data
 if(!input||typeof input!=='object'||Array.isArray(input)||!validUuid(input.campaignId))return Response.json({error:'请求格式无效'},{status:400})
 const subject=cleanText(input.subject,160),body=cleanText(input.body,20000)
 const retryTime=input.retryCutoff?Date.parse(input.retryCutoff):NaN
 if(input.retryCutoff&&!Number.isFinite(retryTime))return Response.json({error:'重试时间无效'},{status:400})
 const retryCutoff=Number.isFinite(retryTime)?new Date(Math.min(retryTime,Date.now())).toISOString():null
 const db=createAdminClient()
 try{
  const {error:trackingError}=await db.from(TABLE).select('id').limit(1)
  if(trackingError)return Response.json({error:'群发记录迁移未完成，请先执行数据库迁移。'},{status:503})
  let {data:campaign,error:lookupError}=await db.from('email_campaigns').select('*').eq('id',input.campaignId).maybeSingle()
  if(lookupError)throw lookupError
  if(!campaign){
   if(!subject||!body)return Response.json({error:'主题和正文不能为空'},{status:400})
   const result=await db.from('email_campaigns').insert({id:input.campaignId,subject,body,recipient_count:0,status:'preparing',created_by:user.id}).select('*').single()
   if(result.error&&result.error.code!=='23505')throw result.error
   if(result.data)campaign=result.data
   else{
    const reread=await db.from('email_campaigns').select('*').eq('id',input.campaignId).single()
    if(reread.error)throw reread.error
    campaign=reread.data
   }
  }
  if(campaign.created_by!==user.id)return Response.json({error:'无权重试此群发'},{status:403})
  if((subject&&subject!==campaign.subject)||(body&&body!==campaign.body))return Response.json({error:'群发内容已改变，请开始新任务。'},{status:409})
  if(campaign.status==='preparing'){
   const subscribers=await allRows(()=>db.from('subscribers').select('id,email').eq('status','active').not('verified_at','is',null).lte('created_at',campaign.created_at).order('created_at').order('id'))
   for(let start=0;start<subscribers.length;start+=RESEND_BATCH_SIZE){
    const chunk=subscribers.slice(start,start+RESEND_BATCH_SIZE)
    const {error}=await db.from(TABLE).upsert(chunk.map(row=>({campaign_id:campaign.id,subscriber_id:row.id,email:row.email,status:'pending'})),{onConflict:'campaign_id,subscriber_id',ignoreDuplicates:true})
    if(error)throw error
   }
   const rows=await deliveryRows(db,campaign.id)
   const {error}=await db.from('email_campaigns').update({status:'sending',recipient_count:rows.length}).eq('id',campaign.id).eq('status','preparing')
   if(error)throw error
  }
  const rows=await deliveryRows(db,campaign.id)
  if(campaign.status!=='preparing'&&campaign.recipient_count>0&&!rows.length)return Response.json({error:'旧版群发没有逐人记录，无法安全重试。'},{status:409})
  if(campaign.status==='sent')return Response.json(await finish(db,campaign,retryCutoff),{headers:{'Cache-Control':'no-store'}})
  const staleBefore=new Date(Date.now()-STALE_SENDING_MS).toISOString()
  const candidates=rows.filter(row=>row.status==='pending'||row.status==='sending'&&row.updated_at<staleBefore||retryCutoff&&row.status==='failed'&&row.updated_at<retryCutoff).slice(0,SENDS_PER_REQUEST)
  if(candidates.length){
   const claimed=await claimDeliveries(db,campaign.id,candidates.map(row=>row.subscriber_id),retryCutoff)
   const targets=candidates.filter(row=>claimed.has(row.subscriber_id))
   if(targets.length){
   const {data:active,error:activeError}=await db.from('subscribers').select('id,manage_token').in('id',targets.map(row=>row.subscriber_id)).eq('status','active').not('verified_at','is',null)
   if(activeError)throw activeError
   const activeById=new Map((active||[]).map(row=>[row.id,row]))
   const skipped=targets.filter(row=>!activeById.has(row.subscriber_id))
   if(skipped.length){
    const {error}=await db.from(TABLE).update({status:'skipped',updated_at:new Date().toISOString()}).eq('campaign_id',campaign.id).in('subscriber_id',skipped.map(row=>row.subscriber_id)).eq('status','sending')
    if(error)throw error
   }
   const recipients=targets.filter(row=>activeById.has(row.subscriber_id))
   for(const recipient of recipients){
    const result=await sendEmail({from:process.env.NOTIFICATION_FROM,to:[recipient.email],subject:campaign.subject,text:campaign.body,html:html(campaign.subject,campaign.body,activeById.get(recipient.subscriber_id).manage_token)},idempotencyKey('campaign',campaign.id,recipient.subscriber_id))
    const {error}=await db.from(TABLE).update({status:result.ok?'sent':'failed',provider_id:result.id,error:result.error||'',updated_at:new Date().toISOString()}).eq('campaign_id',campaign.id).eq('subscriber_id',recipient.subscriber_id).eq('status','sending')
    if(error)throw error
   }
   }
  }
  return Response.json(await finish(db,campaign,retryCutoff),{headers:{'Cache-Control':'no-store'}})
 }catch(error){
  console.error('campaign failed',error)
  return Response.json({error:'群发中断，请刷新发送记录后重试。'},{status:500,headers:{'Cache-Control':'no-store'}})
 }
}
