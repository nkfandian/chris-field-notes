import {createClient as createAdminClient} from '@supabase/supabase-js'

function admin(){return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})}
function esc(value=''){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]))}
function bodyHtml(body=''){return String(body).replace(/\r\n?/g,'\n').trim().split(/\n\s*\n+/).filter(Boolean).map(block=>{const image=block.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)|![^\s]*?(https?:\/\/[^\s]+)|(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|avif)(?:\?[^\s]*)?)/i);if(image){const src=image[1]||image[2]||image[3];return `<img src="${esc(src)}" alt="文章配图" style="display:block;width:100%;height:auto;margin:32px 0;border:1px solid #d1d0ca">`}return `<p style="margin:0 0 22px;font:17px/1.9 Georgia,'Noto Serif SC',serif;color:#151713">${esc(block).replace(/\n/g,'<br>')}</p>`}).join('')}
function emailHtml(post,manageToken){const url=`https://www.chrisreading.ink/logs/${encodeURIComponent(post.slug)}`,logo='https://www.chrisreading.ink/field-notes-mark.png',unsubscribe=`https://www.chrisreading.ink/unsubscribe?token=${encodeURIComponent(manageToken||'')}`;return `<!doctype html><html><body style="margin:0;background:#efeee8;color:#151713"><div style="max-width:720px;margin:auto;padding:42px 24px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-bottom:1px solid #151713;padding-bottom:14px"><tr><td width="46"><img src="${logo}" width="38" height="38" alt="CHRIS / FIELD NOTES" style="display:block;border:0;border-radius:7px"></td><td style="font:11px monospace;letter-spacing:.12em"><b>FIELD NOTES</b><br><span style="font-size:8px;color:#696d65">CHRIS / OPEN INDEX</span></td><td align="right" style="font:10px monospace;color:#526b3f;letter-spacing:.12em">NEW ENTRY</td></tr></table><div style="padding:54px 0 34px"><div style="font:10px monospace;color:#526b3f;letter-spacing:.12em">${esc(post.domain).toUpperCase()} / 最新日志</div><h1 style="margin:18px 0 24px;font:700 44px/1.15 Georgia,'Noto Serif SC',serif;letter-spacing:-.04em">${esc(post.title)}</h1><p style="font:18px/1.7 Georgia,'Noto Serif SC',serif;color:#696d65">${esc(post.excerpt||'')}</p></div><div style="border-top:1px solid #b9b9b2;padding-top:34px">${bodyHtml(post.body||post.excerpt)}</div><a href="${url}" style="display:inline-block;margin-top:28px;padding:13px 18px;background:#151713;color:#efeee8;text-decoration:none;font:11px monospace">在网站阅读与评论 →</a><div style="margin-top:60px;border-top:1px solid #151713;padding-top:14px;font:10px/1.7 monospace;color:#696d65">你收到此邮件，是因为订阅了 CHRIS / FIELD NOTES。<br>本邮件不会发送网站启用订阅前的历史文章。　<a href="${unsubscribe}" style="color:#696d65">管理或取消订阅</a></div></div></body></html>`}

export async function deliverPending({postIds}={}){
 const db=admin()
 let postQuery=db.from('posts').select('id,slug,title,excerpt,body,domain').eq('status','published').is('notification_sent_at',null).order('published_at',{ascending:true})
 if(postIds?.length)postQuery=postQuery.in('id',postIds)
 const [{data:posts,error:postError},{data:subscribers,error:subscriberError}]=await Promise.all([postQuery,db.from('subscribers').select('id,email,manage_token').eq('status','active').not('verified_at','is',null).order('created_at')])
 if(postError||subscriberError)throw new Error(postError?.message||subscriberError?.message)
 const results=[]
 for(const post of posts||[]){
  const {data:delivered,error:deliveryReadError}=await db.from('email_deliveries').select('subscriber_id').eq('post_id',post.id).eq('status','sent')
  if(deliveryReadError)throw new Error(deliveryReadError.message)
  const completed=new Set((delivered||[]).map(row=>row.subscriber_id))
  for(const subscriber of subscribers||[]){
   if(completed.has(subscriber.id))continue
   await db.from('email_deliveries').upsert({post_id:post.id,subscriber_id:subscriber.id,email:subscriber.email,status:'sending',error:'',updated_at:new Date().toISOString()},{onConflict:'post_id,subscriber_id'})
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${process.env.RESEND_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({from:process.env.NOTIFICATION_FROM,to:[subscriber.email],subject:`新日志｜${post.title}`,html:emailHtml(post,subscriber.manage_token)})})
   let providerId=null,error=''
   if(response.ok){providerId=(await response.json()).id||null;completed.add(subscriber.id)}else error=await response.text()
   await db.from('email_deliveries').update({status:response.ok?'sent':'failed',provider_id:providerId,error,updated_at:new Date().toISOString()}).eq('post_id',post.id).eq('subscriber_id',subscriber.id)
  }
  const allSent=(subscribers||[]).every(subscriber=>completed.has(subscriber.id))
  if(allSent)await db.from('posts').update({notification_sent_at:new Date().toISOString()}).eq('id',post.id)
  results.push({post:post.slug,sent:completed.size,failed:(subscribers||[]).length-completed.size,complete:allSent})
 }
 return {processed:posts?.length||0,results}
}
