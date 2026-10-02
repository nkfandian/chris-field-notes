import {createAdminClient} from '@/lib/supabase/admin'
import {emailPreview,preheaderHtml} from '@/lib/email-preview'
import {parsePostBlocks} from '@/lib/post-format'
import {RESEND_BATCH_SIZE,idempotencyKey,sendEmailBatch} from '@/lib/resend'

// 超过该时长仍为 sending 的投递视为中断（例如函数超时），允许重新领取。
const STALE_SENDING_MS=15*60*1000
function esc(value=''){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]))}
function inlineHtml(runs=[],options={}){return runs.map(run=>{let content=esc(run.text).replace(/\n/g,'<br>');if(run.code)content=`<code style="padding:2px 5px;background:#e2e1da;font:14px/1.5 'IBM Plex Mono',monospace">${content}</code>`;if(run.bold||options.bold)content=`<strong style="font-weight:700">${content}</strong>`;if(run.italic)content=`<em>${content}</em>`;if(run.strike)content=`<span style="text-decoration:line-through">${content}</span>`;if(run.href)content=`<a href="${esc(run.href)}" style="color:#526b3f;text-decoration:underline">${content}</a>`;return content}).join('')}
function bodyHtml(body=''){return parsePostBlocks(body).map(block=>{
 const align=block.align==='center'?'text-align:center;':''
 if(block.type==='image')return block.src?`<figure style="margin:32px 0"><img src="${esc(block.src)}" alt="${esc(block.alt)}" style="display:block;width:100%;height:auto;border:1px solid #d1d0ca"><figcaption style="margin-top:8px;text-align:center;font:11px/1.5 monospace;color:#696d65">${block.alt==='文章配图'?'':esc(block.alt)}</figcaption></figure>`:''
 if(block.type==='hr')return '<div style="height:28px;border-top:1px solid #b9b9b2;margin-top:28px">&nbsp;</div>'
 if(block.type==='h1'||block.type==='h2'||block.type==='h3'){const size=block.type==='h1'?30:block.type==='h2'?25:21;return `<h${block.type.slice(1)} style="margin:34px 0 16px;${align}font:700 ${size}px/1.35 Georgia,'Noto Serif SC',serif;color:#151713">${inlineHtml(block.runs,{bold:block.blockBold})}</h${block.type.slice(1)}>`}
 if(block.type==='ul'||block.type==='ol'){const tag=block.type;return `<${tag} style="margin:0 0 24px;padding-left:26px;font:17px/1.9 Georgia,'Noto Serif SC',serif;color:#151713">${block.items.map(item=>`<li style="margin:0 0 7px">${inlineHtml(item,{bold:block.blockBold})}</li>`).join('')}</${tag}>`}
 if(block.type==='quote')return `<blockquote style="margin:28px 0;padding:4px 0 4px 20px;border-left:3px solid #526b3f;${align}font:italic 17px/1.9 Georgia,'Noto Serif SC',serif;color:#565b53">${inlineHtml(block.runs,{bold:block.blockBold})}</blockquote>`
 return `<p style="margin:0 0 22px;${align}font:${block.blockBold?'700':'400'} 17px/1.9 Georgia,'Noto Serif SC',serif;color:#151713">${inlineHtml(block.runs,{bold:block.blockBold})}</p>`
}).join('')}
function emailHtml(post,manageToken){const url=`https://www.chrisreading.ink/logs/${encodeURIComponent(post.slug)}`,logo='https://www.chrisreading.ink/field-notes-mark.png',unsubscribe=`https://www.chrisreading.ink/unsubscribe?token=${encodeURIComponent(manageToken||'')}`,preview=emailPreview(post.excerpt||post.body);return `<!doctype html><html><body style="margin:0;background:#efeee8;color:#151713">${preheaderHtml(preview)}<div style="max-width:720px;margin:auto;padding:42px 24px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-bottom:1px solid #151713;padding-bottom:14px"><tr><td width="46"><img src="${logo}" width="38" height="38" alt="" style="display:block;border:0;border-radius:7px"></td><td style="font:11px monospace;letter-spacing:.12em"><b>FIELD NOTES</b><br><span style="font-size:8px;color:#696d65">CHRIS / OPEN INDEX</span></td><td align="right" style="font:10px monospace;color:#526b3f;letter-spacing:.12em">NEW ENTRY</td></tr></table><div style="padding:54px 0 34px"><div style="font:10px monospace;color:#526b3f;letter-spacing:.12em">${esc(post.domain).toUpperCase()} / 最新日志</div><h1 style="margin:18px 0 24px;font:700 44px/1.15 Georgia,'Noto Serif SC',serif;letter-spacing:-.04em">${esc(post.title)}</h1><p style="font:18px/1.7 Georgia,'Noto Serif SC',serif;color:#696d65">${esc(post.excerpt||'')}</p></div><div style="border-top:1px solid #b9b9b2;padding-top:34px">${bodyHtml(post.body||post.excerpt)}</div><a href="${url}" style="display:inline-block;margin-top:28px;padding:13px 18px;background:#151713;color:#efeee8;text-decoration:none;font:11px monospace">在网站阅读与评论 →</a><div style="margin-top:60px;border-top:1px solid #151713;padding-top:14px;font:10px/1.7 monospace;color:#696d65">你收到此邮件，是因为订阅了 CHRIS / FIELD NOTES。<br>本邮件不会发送网站启用订阅前的历史文章。　<a href="${unsubscribe}" style="color:#696d65">管理或取消订阅</a></div></div></body></html>`}

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
 let postQuery=db.from('posts').select('id,slug,title,excerpt,body,domain').eq('status','published').is('notification_sent_at',null).order('published_at',{ascending:true})
 if(postIds?.length)postQuery=postQuery.in('id',postIds)
 const {data:posts,error:postError}=await postQuery
 if(postError)throw new Error(postError.message)
 if(!posts?.length)return {processed:0,results:[]}
 const subscribers=await allRows(()=>db.from('subscribers').select('id,email,manage_token').eq('status','active').not('verified_at','is',null).order('created_at').order('id'))
 const results=[]
 for(const post of posts){
  const url=`https://www.chrisreading.ink/logs/${encodeURIComponent(post.slug)}`
  const text=`${post.excerpt||emailPreview(post.body)}\n\n${url}`
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
