import {createHash} from 'node:crypto'

function hashKey(scope,value){
 const secret=process.env.RATE_LIMIT_SALT||process.env.SUPABASE_SERVICE_ROLE_KEY||'local-rate-limit'
 return createHash('sha256').update(`${scope}:${value}:${secret}`).digest('hex')
}

export function clientKey(request,scope='public'){
 const forwarded=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-real-ip')||'unknown'
 return hashKey(scope,forwarded)
}

export function subjectKey(value,scope='subject'){
 return hashKey(scope,String(value||'').trim().toLowerCase())
}

export async function enforceRateLimit(db,key,limit=3,windowSeconds=600){
 const {data,error}=await db.rpc('check_rate_limit',{p_key:key,p_limit:limit,p_window_seconds:windowSeconds})
 if(error)throw new Error(error.message)
 return Boolean(data)
}

export function cleanText(value,max=2000){return String(value||'').trim().slice(0,max)}
export function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||''))}
export function validUuid(value){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||''))}
export function requestTooLarge(request,maxBytes=16384){const length=Number(request.headers.get('content-length')||0);return Number.isFinite(length)&&length>maxBytes}

export function originGuard(request){
 const fetchSite=String(request.headers.get('sec-fetch-site')||'').toLowerCase()
 if(fetchSite==='cross-site')return Response.json({error:'禁止跨站提交。'},{status:403})
 const origin=request.headers.get('origin')
 if(!origin)return null
 try{
  const requestUrl=new URL(request.url)
  const allowedOrigins=new Set([requestUrl.origin])
  const forwardedHost=request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host=forwardedHost||request.headers.get('host')
  const forwardedProto=request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  if(host)allowedOrigins.add(new URL(`${forwardedProto||requestUrl.protocol.replace(':','')}://${host}`).origin)
  if(!allowedOrigins.has(new URL(origin).origin))return Response.json({error:'禁止跨站提交。'},{status:403})
 }catch{return Response.json({error:'请求来源无效。'},{status:400})}
 return null
}

export function jsonMutationGuard(request,maxBytes=16384){
 if(requestTooLarge(request,maxBytes))return Response.json({error:'请求内容过大。'},{status:413})
 const contentType=String(request.headers.get('content-type')||'').split(';',1)[0].trim().toLowerCase()
 if(contentType!=='application/json')return Response.json({error:'仅接受 JSON 请求。'},{status:415})
 return originGuard(request)
}

export async function parseJsonBody(request,maxBytes=16384){
 const reader=request.body?.getReader()
 if(!reader)return {response:Response.json({error:'请求格式无效。'},{status:400})}
 const chunks=[]
 let total=0
 while(true){
  const {done,value}=await reader.read()
  if(done)break
  total+=value.byteLength
  if(total>maxBytes){await reader.cancel();return {response:Response.json({error:'请求内容过大。'},{status:413})}}
  chunks.push(value)
 }
 const bytes=new Uint8Array(total)
 let offset=0
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 try{return {data:JSON.parse(new TextDecoder().decode(bytes))}}
 catch{return {response:Response.json({error:'请求格式无效。'},{status:400})}}
}
