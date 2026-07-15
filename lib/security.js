import {createHash} from 'node:crypto'

export function clientKey(request,scope){
 const forwarded=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-real-ip')||'unknown'
 return createHash('sha256').update(`${scope}:${forwarded}:${process.env.SUPABASE_SERVICE_ROLE_KEY||'field-notes'}`).digest('hex')
}

export async function enforceRateLimit(db,request,scope,limit=3,windowSeconds=600){
 const {data,error}=await db.rpc('check_rate_limit',{p_key:clientKey(request,scope),p_limit:limit,p_window_seconds:windowSeconds})
 if(error)throw new Error(error.message)
 return Boolean(data)
}

export function cleanText(value,max=2000){return String(value||'').trim().slice(0,max)}
export function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||''))}
export function validUuid(value){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||''))}
export function requestTooLarge(request,maxBytes=16384){const length=Number(request.headers.get('content-length')||0);return Number.isFinite(length)&&length>maxBytes}
