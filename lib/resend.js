import 'server-only'
import {createHash} from 'node:crypto'

// Resend 默认限制每秒请求数；批量接口一次最多 100 封。
export const RESEND_BATCH_SIZE=100
const MIN_INTERVAL_MS=600
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
let lastRequestAt=0

export function idempotencyKey(...parts){
 return createHash('sha256').update(parts.join('/')).digest('hex')
}

async function resendPost(path,payload,key){
 for(let attempt=0;;attempt++){
  const wait=lastRequestAt+MIN_INTERVAL_MS-Date.now()
  if(wait>0)await sleep(wait)
  lastRequestAt=Date.now()
  const response=await fetch(`https://api.resend.com${path}`,{
   method:'POST',
   headers:{authorization:`Bearer ${process.env.RESEND_API_KEY}`,'content-type':'application/json',...(key?{'idempotency-key':key}:{})},
   body:JSON.stringify(payload),
   signal:AbortSignal.timeout(20000)
  })
  if(response.status!==429||attempt>=2)return response
  await sleep(Math.min(Number(response.headers.get('retry-after'))||1,10)*1000)
 }
}

async function readError(response){return (await response.text().catch(()=>'')).slice(0,500)||`HTTP ${response.status}`}

export async function sendEmail(message,key){
 try{
  const response=await resendPost('/emails',message,key)
  if(!response.ok)return {ok:false,id:null,error:await readError(response)}
  const body=await response.json().catch(()=>({}))
  return {ok:true,id:body.id||null,error:''}
 }catch(error){return {ok:false,id:null,error:String(error?.message||error).slice(0,500)}}
}

// items: [{message,key}]，返回与 items 顺序一致的 [{ok,id,error}]。
// 整批因校验失败（如某个地址无效）被拒时，逐封重发以隔离问题地址。
export async function sendEmailBatch(items,batchKey){
 if(!items.length)return []
 if(items.length===1)return [await sendEmail(items[0].message,items[0].key)]
 try{
  const response=await resendPost('/emails/batch',items.map(item=>item.message),batchKey)
  if(response.ok){
   const body=await response.json().catch(()=>({}))
   const ids=Array.isArray(body.data)?body.data:[]
   return items.map((_,index)=>({ok:true,id:ids[index]?.id||null,error:''}))
  }
  const error=await readError(response)
  if(response.status===400||response.status===422){
   const results=[]
   for(const item of items)results.push(await sendEmail(item.message,item.key))
   return results
  }
  return items.map(()=>({ok:false,id:null,error}))
 }catch(error){
  const message=String(error?.message||error).slice(0,500)
  return items.map(()=>({ok:false,id:null,error:message}))
 }
}
