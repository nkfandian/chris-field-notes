import 'server-only'
import {createAdminClient} from '@/lib/supabase/admin'
import {createPublicClient,isConfigured} from '@/lib/supabase/server'
import {plainText} from '@/lib/seo'

const FALLBACK_KEY='weibos'

export const demoWeibos=[
 {
  id:'00000000-0000-4000-8000-000000000001',
  slug:'weibo-00000001',
  body:'重翻何伟的《江城》，他最厉害的不是写出多宏大的时代命题，而是把涪陵街头修鞋匠、小面馆老板眼神里的犹豫，像标本一样夹进书页里。',
  status:'published',
  likes:18,
  published_at:'2026-11-21T00:40:00.000Z',
  created_at:'2026-11-21T00:40:00.000Z',
  updated_at:'2026-11-21T00:40:00.000Z'
 },
 {
  id:'00000000-0000-4000-8000-000000000002',
  slug:'weibo-00000002',
  body:'把个人网站当成自己的工作台之后，最大的变化是不再为了凑够三千字才动笔。有些念头只有一百字，收在这里反而成了后来写长文的火种。',
  status:'published',
  likes:27,
  published_at:'2026-11-19T14:15:00.000Z',
  created_at:'2026-11-19T14:15:00.000Z',
  updated_at:'2026-11-19T14:15:00.000Z'
 }
]

function getAdminOrNull(){
 try{return createAdminClient()}catch{return null}
}

function isMissingTable(error){
 const msg=String(error?.message||'')
 const code=String(error?.code||'')
 return code==='42P01'||code==='PGRST205'||/relation .*weibos.* does not exist|Could not find the table/i.test(msg)
}

export function weiboExcerpt(body='',max=36){
 const text=plainText(body)
 if(!text)return '微博'
 return text.length>max?`${text.slice(0,max)}…`:text
}

async function readFallbackStore(db){
 const client=getAdminOrNull()||db
 if(!client)return []
 const {data}=await client.from('site_content').select('value').eq('key',FALLBACK_KEY).maybeSingle()
 const items=Array.isArray(data?.value?.items)?data.value.items:[]
 return items.sort((a,b)=>new Date(b.published_at||b.created_at)-new Date(a.published_at||a.created_at))
}

async function writeFallbackStore(db,items){
 const client=getAdminOrNull()||db
 const now=new Date().toISOString()
 const sorted=[...items].sort((a,b)=>new Date(b.published_at||b.created_at)-new Date(a.published_at||a.created_at))
 const {error}=await client.from('site_content').upsert({key:FALLBACK_KEY,value:{items:sorted},updated_at:now})
 if(error)throw new Error(error.message)
 return sorted
}

export async function attachWeiboComments(items=[],publicDb=null){
 if(!items.length)return []
 const slugs=items.map(item=>item.slug).filter(Boolean)
 const grouped=new Map(slugs.map(slug=>[slug,[]]))
 const admin=getAdminOrNull()
 if(admin&&slugs.length){
  const {data}=await admin.from('comments').select('id,parent_id,post_slug,name,body,created_at').eq('status','approved').in('post_slug',slugs).order('created_at',{ascending:true})
  for(const row of data||[]){
   if(grouped.has(row.post_slug))grouped.get(row.post_slug).push({id:row.id,parent_id:row.parent_id,name:row.name,body:row.body,created_at:row.created_at})
  }
 }else if(publicDb&&slugs.length){
  await Promise.all(slugs.map(async slug=>{
   const {data}=await publicDb.rpc('get_public_comments',{p_post_slug:slug})
   grouped.set(slug,[...(data||[])].reverse())
  }))
 }
 return items.map(item=>{
  const all=grouped.get(item.slug)||[]
  const topComments=all.filter(c=>!c.parent_id)
  const replies={}
  for(const c of all)if(c.parent_id)(replies[c.parent_id]||=[]).push(c)
  return {...item,comments:topComments,replies,comment_count:topComments.length}
 })
}

export async function listPublicWeibos({limit=100,withComments=true}={}){
 if(!isConfigured()){
  const base=demoWeibos.slice(0,limit)
  return base.map(item=>({...item,comments:[],replies:{},comment_count:0}))
 }
 const db=getAdminOrNull()||createPublicClient()
 let items=[]
 for(let from=0;from<limit;from+=1000){
  const to=Math.min(from+999,limit-1)
  const {data,error}=await db.from('weibos').select('*').eq('status','published').order('published_at',{ascending:false}).range(from,to)
  if(error){
   if(isMissingTable(error)){
    items=(await readFallbackStore(db)).filter(x=>x.status==='published').slice(0,limit)
    break
   }
   return []
  }
  if(!data||!data.length)break
  items.push(...data)
  if(data.length<1000)break
 }
 return withComments?attachWeiboComments(items,createPublicClient()):items
}

export async function listPublicWeibosPage({page=1,pageSize=20,withComments=true}={}){
 const safePage=Math.max(1,Number(page)||1)
 const safeSize=Math.max(1,Math.min(100,Number(pageSize)||20))
 if(!isConfigured()){
  const slice=demoWeibos.slice((safePage-1)*safeSize,safePage*safeSize).map(item=>({...item,comments:[],replies:{},comment_count:0}))
  return {items:slice,total:demoWeibos.length,page:safePage,pageSize:safeSize}
 }
 const db=getAdminOrNull()||createPublicClient()
 const from=(safePage-1)*safeSize
 const {data,count,error}=await db.from('weibos').select('*',{count:'exact'}).eq('status','published').order('published_at',{ascending:false}).range(from,from+safeSize-1)
 if(error){
  if(isMissingTable(error)){
   const all=(await readFallbackStore(db)).filter(x=>x.status==='published')
   return {items:all.slice(from,from+safeSize),total:all.length,page:safePage,pageSize:safeSize}
  }
  return {items:[],total:0,page:safePage,pageSize:safeSize}
 }
 const items=withComments?await attachWeiboComments(data||[],createPublicClient()):(data||[])
 return {items,total:count||items.length,page:safePage,pageSize:safeSize}
}

export async function listAdminWeibos(sessionDb){
 if(!isConfigured())return []
 const db=getAdminOrNull()||sessionDb
 const {data,error}=await db.from('weibos').select('*').order('published_at',{ascending:false})
 if(error){
  if(isMissingTable(error))return readFallbackStore(sessionDb)
  throw new Error(error.message)
 }
 return data||[]
}

export async function getPublicWeiboBySlug(slug){
 if(!slug||!isConfigured())return null
 const db=getAdminOrNull()||createPublicClient()
 const {data,error}=await db.from('weibos').select('id,slug,body,status,published_at').eq('slug',slug).eq('status','published').maybeSingle()
 if(error){
  if(isMissingTable(error)){
   const all=await readFallbackStore(db)
   return all.find(x=>x.slug===slug&&x.status==='published')||null
  }
  return null
 }
 return data||null
}

export async function saveWeibo(sessionDb,{id,body,status='published',published_at}){
 const db=getAdminOrNull()||sessionDb
 const now=new Date().toISOString()
 const pubDate=published_at&&!Number.isNaN(Date.parse(published_at))?new Date(published_at).toISOString():now
 const nextId=id||crypto.randomUUID()
 const slug=`weibo-${nextId.replace(/-/g,'').slice(0,12)}`
 if(id){
  const {data:existing,error:readErr}=await db.from('weibos').select('id,slug,likes').eq('id',id).maybeSingle()
  if(readErr&&isMissingTable(readErr)){
   const items=await readFallbackStore(sessionDb)
   const idx=items.findIndex(x=>x.id===id)
   if(idx<0)throw new Error('微博不存在')
   const updated={...items[idx],body,status,published_at:pubDate,updated_at:now}
   items[idx]=updated
   await writeFallbackStore(sessionDb,items)
   return updated
  }
  if(readErr)throw new Error(readErr.message)
  if(!existing)throw new Error('微博不存在')
  const {data,error}=await db.from('weibos').update({body,status,published_at:pubDate,updated_at:now}).eq('id',id).select('*').single()
  if(error)throw new Error(error.message)
  return data
 }
 const payload={id:nextId,slug,body,status,likes:0,published_at:pubDate,created_at:now,updated_at:now}
 const {data,error}=await db.from('weibos').insert(payload).select('*').single()
 if(error){
  if(isMissingTable(error)){
   const items=await readFallbackStore(sessionDb)
   items.unshift(payload)
   await writeFallbackStore(sessionDb,items)
   return payload
  }
  throw new Error(error.message)
 }
 return data
}

export async function deleteWeibo(sessionDb,id){
 const db=getAdminOrNull()||sessionDb
 const {data:existing,error:readErr}=await db.from('weibos').select('id,slug').eq('id',id).maybeSingle()
 if(readErr&&isMissingTable(readErr)){
  const items=await readFallbackStore(sessionDb)
  const target=items.find(x=>x.id===id)
  const next=items.filter(x=>x.id!==id)
  await writeFallbackStore(sessionDb,next)
  if(target?.slug)await db.from('comments').delete().eq('post_slug',target.slug)
  return target
 }
 if(readErr)throw new Error(readErr.message)
 const {error}=await db.from('weibos').delete().eq('id',id)
 if(error)throw new Error(error.message)
 if(existing?.slug)await db.from('comments').delete().eq('post_slug',existing.slug)
 return existing
}

export async function incrementWeiboLike(id){
 const db=getAdminOrNull()
 if(!db)throw new Error('服务未配置')
 const {data:row,error:readErr}=await db.from('weibos').select('id,likes,status').eq('id',id).eq('status','published').maybeSingle()
 if(readErr&&isMissingTable(readErr)){
  const items=await readFallbackStore(db)
  const idx=items.findIndex(x=>x.id===id&&x.status==='published')
  if(idx<0)return null
  items[idx]={...items[idx],likes:(Number(items[idx].likes)||0)+1}
  await writeFallbackStore(db,items)
  return items[idx].likes
 }
 if(readErr)throw new Error(readErr.message)
 if(!row)return null
 const nextLikes=(Number(row.likes)||0)+1
 const {error}=await db.from('weibos').update({likes:nextLikes}).eq('id',id)
 if(error)throw new Error(error.message)
 return nextLikes
}
