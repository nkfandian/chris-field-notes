import {redirect} from 'next/navigation'
import {createClient,isConfigured} from '@/lib/supabase/server'
import SubscriberManager from './subscriber-manager'
import {getSiteAdmin} from '@/lib/auth'
import '../studio.css'
import './subscribers.css'

export const dynamic='force-dynamic'

const automaticHistory=(deliveries,posts)=>{
  const groups=new Map()
  const postMap=new Map((posts||[]).map(post=>[post.id,post]))
  for(const delivery of deliveries||[]){
    const post=postMap.get(delivery.post_id)
    const entry=groups.get(delivery.post_id)||{id:`post-${delivery.post_id}`,type:'automatic',title:post?.title||'新日志推送',slug:post?.slug,total:0,sent:0,failed:0,created_at:delivery.created_at}
    entry.total++
    if(delivery.status==='sent')entry.sent++
    if(delivery.status==='failed')entry.failed++
    if(new Date(delivery.created_at)>new Date(entry.created_at))entry.created_at=delivery.created_at
    groups.set(delivery.post_id,entry)
  }
  for(const post of posts||[])if(post.notification_sent_at&&!groups.has(post.id))groups.set(post.id,{id:`post-${post.id}`,type:'automatic',title:post.title,slug:post.slug,total:0,sent:0,failed:0,created_at:post.notification_sent_at})
  return [...groups.values()].map(x=>({...x,status:x.failed?(x.sent?'partial':'failed'):'sent'}))
}

export default async function SubscribersPage(){
  if(!isConfigured())return null
  const db=await createClient()
  if(!await getSiteAdmin(db))redirect('/studio')
  const [{data:subscribers},{data:campaigns},{data:deliveries},{data:posts}]=await Promise.all([
    db.from('subscribers').select('*').order('created_at',{ascending:false}),
    db.from('email_campaigns').select('*').order('created_at',{ascending:false}).limit(30),
    db.from('email_deliveries').select('id,post_id,status,created_at').order('created_at',{ascending:false}).limit(500),
    db.from('posts').select('id,title,slug,notification_sent_at').order('updated_at',{ascending:false}).limit(200)
  ])
  const manual=(campaigns||[]).map(x=>({id:`campaign-${x.id}`,type:'manual',title:x.subject,total:x.recipient_count,status:x.status,created_at:x.sent_at||x.created_at}))
  const history=[...automaticHistory(deliveries,posts),...manual].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,30)
  return <SubscriberManager initial={subscribers||[]} history={history}/>
}
