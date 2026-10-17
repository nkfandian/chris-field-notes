import {createAdminClient} from '@/lib/supabase/admin'
import {emailPreview} from '@/lib/email-preview'
import {labels} from '@/lib/demo'
import {SITE_URL,articleHeader,ctaButton,emailShell,plainBody,postBodyHtml,unsubscribeLink} from '@/lib/email-template'
import {RESEND_BATCH_SIZE,idempotencyKey,sendEmailBatch} from '@/lib/resend'

// 超过该时长仍为 sending 的投递视为中断（例如函数超时），允许重新领取。
const STALE_SENDING_MS=15*60*1000
// 新日志推送邮件：版式与网站手机端日志页一致（不显示摘要；摘要只用作收件箱预览文字）。
export function emailHtml(post,manageToken){
 const url=`${SITE_URL}/logs/${encodeURIComponent(post.slug)}`
 const category=labels[post.domain]?.split('/ ')[1]||post.domain||''
 const inner=articleHeader({category,categoryUrl:`${SITE_URL}/logs?domain=${encodeURIComponent(post.domain||'')}`,title:post.title,date:String(post.published_at||'').slice(0,10)})+postBodyHtml(post.body||post.excerpt)+ctaButton(url,'在网站阅读与评论 →')
 return emailShell({preheader:emailPreview(post.excerpt||post.body),inner,unsubscribeUrl:unsubscribeLink(manageToken)})
}

// PostgREST 单次最多返回 1000 行，分页读取全部记录。
export async function allRows(build){
 const rows=[]
 for(let from=0;;from+=1000){
  const {data,error}=await build().range(from,from+999)
  if(error)throw new Error(error.message)
  rows.push(...(data||[]))
  if(!data||data.length<1000)return rows
 }
}

// 原子地领取一批投递：新行插入即领取；failed 行和超时的 sending 行通过条件更新领取。
// 并发请求（重复点击保存、两个 Vercel 项目的定时任务）不会领取到同一订阅者。
async function claimDeliveries(db,post,chunk){
 const now=new Date().toISOString()
 const ids=chunk.map(subscriber=>subscriber.id)
 const {data:inserted,error:insertError}=await db.from('email_deliveries').upsert(chunk.map(subscriber=>({post_id:post.id,subscriber_id:subscriber.id,email:subscriber.email,status:'sending',error:'',updated_at:now})),{onConflict:'post_id,subscriber_id',ignoreDuplicates:true}).select('subscriber_id')
 if(insertError)throw new Error(insertError.message)
 const {data:retried,error:retryError}=await db.from('email_deliveries').update({status:'sending',error:'',updated_at:now}).eq('post_id',post.id).in('subscriber_id',ids).eq('status','failed').select('subscriber_id')
 if(retryError)throw new Error(retryError.message)
 const {data:stale,error:staleError}=await db.from('email_deliveries').update({status:'sending',error:'',updated_at:now}).eq('post_id',post.id).in('subscriber_id',ids).eq('status','sending').lt('updated_at',new Date(Date.now()-STALE_SENDING_MS).toISOString()).select('subscriber_id')
 if(staleError)throw new Error(staleError.message)
 return new Set([...(inserted||[]),...(retried||[]),...(stale||[])].map(row=>row.subscriber_id))
}

export async function deliverPending({postIds}={}){
 const db=createAdminClient()
 let postQuery=db.from('posts').select('id,slug,title,excerpt,body,domain,published_at').eq('status','published').is('notification_sent_at',null).order('published_at',{ascending:true})
 if(postIds?.length)postQuery=postQuery.in('id',postIds)
 const {data:posts,error:postError}=await postQuery
 if(postError)throw new Error(postError.message)
 if(!posts?.length)return {processed:0,results:[]}
 const subscribers=await allRows(()=>db.from('subscribers').select('id,email,manage_token').eq('status','active').not('verified_at','is',null).order('created_at').order('id'))
 const results=[]
 for(const post of posts){
  const url=`${SITE_URL}/logs/${encodeURIComponent(post.slug)}`
  const text=`${post.title}\n\n${plainBody(post.body||post.excerpt)}\n\n在网站阅读与评论：${url}`
  for(let start=0;start<subscribers.length;start+=RESEND_BATCH_SIZE){
   const chunk=subscribers.slice(start,start+RESEND_BATCH_SIZE)
   const claimed=await claimDeliveries(db,post,chunk)
   const targets=chunk.filter(subscriber=>claimed.has(subscriber.id))
   if(!targets.length)continue
   const sent=await sendEmailBatch(targets.map(subscriber=>({
    message:{from:process.env.NOTIFICATION_FROM,to:[subscriber.email],subject:`新日志｜${post.title}`,text,html:emailHtml(post,subscriber.manage_token)},
    key:idempotencyKey('post-notify',post.id,subscriber.id)
   })),idempotencyKey('post-notify',post.id,...targets.map(subscriber=>subscriber.id)))
   await Promise.all(targets.map((subscriber,index)=>db.from('email_deliveries').update({status:sent[index].ok?'sent':'failed',provider_id:sent[index].id,error:sent[index].error,updated_at:new Date().toISOString()}).eq('post_id',post.id).eq('subscriber_id',subscriber.id)))
  }
  const delivered=new Set((await allRows(()=>db.from('email_deliveries').select('subscriber_id').eq('post_id',post.id).eq('status','sent').order('subscriber_id'))).map(row=>row.subscriber_id))
  const sentCount=subscribers.filter(subscriber=>delivered.has(subscriber.id)).length
  const complete=sentCount===subscribers.length
  if(complete)await db.from('posts').update({notification_sent_at:new Date().toISOString()}).eq('id',post.id).is('notification_sent_at',null)
  results.push({post:post.slug,sent:sentCount,failed:subscribers.length-sentCount,complete})
 }
 return {processed:posts.length,results}
}
