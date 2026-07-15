import 'server-only'
import {createHash} from 'node:crypto'
import {SITE_HOST,SITE_URL} from '@/lib/seo'

export function getIndexNowKey(){
  const configured=String(process.env.INDEXNOW_KEY||'').trim()
  if(/^[a-f0-9-]{8,128}$/i.test(configured))return configured
  const seed=configured||process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!seed)return ''
  return createHash('sha256').update(`field-notes:indexnow:${seed}`).digest('hex')
}

export async function notifyIndexNow(paths=[]){
  const key=getIndexNowKey()
  if(!key)return {skipped:true,reason:'missing-key'}
  const urlList=[...new Set(paths.map(path=>new URL(path,SITE_URL)).filter(url=>url.host===SITE_HOST).map(String))]
  if(!urlList.length)return {skipped:true,reason:'no-urls'}
  const response=await fetch('https://api.indexnow.org/indexnow',{
    method:'POST',
    headers:{'content-type':'application/json; charset=utf-8'},
    body:JSON.stringify({host:SITE_HOST,key,keyLocation:`${SITE_URL}/${key}.txt`,urlList}),
    signal:AbortSignal.timeout(5000),
    cache:'no-store'
  })
  return {submitted:urlList.length,accepted:response.ok,status:response.status}
}
