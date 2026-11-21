import {createClient} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'
import {cleanText,jsonMutationGuard,parseJsonBody,validUuid} from '@/lib/security'
import {deleteWeibo,saveWeibo} from '@/lib/weibo'
import {notifyIndexNow} from '@/lib/indexnow'
import {revalidatePath} from 'next/cache'

export async function POST(request){
 const blocked=jsonMutationGuard(request,32768)
 if(blocked)return blocked
 const db=await createClient()
 const user=await getSiteAdmin(db)
 if(!user)return Response.json({error:'unauthorized'},{status:401})
 const parsed=await parseJsonBody(request,32768)
 if(parsed.response)return parsed.response
 const input=parsed.data
 if(!input||typeof input!=='object'||Array.isArray(input))return Response.json({error:'请求格式无效'},{status:400})
 if(input.id&&!validUuid(input.id))return Response.json({error:'微博 ID 格式无效'},{status:400})
 const body=cleanText(input.body,5000)
 const status=input.status==='draft'?'draft':'published'
 if(!body)return Response.json({error:'微博内容不能为空'},{status:400})
 try{
  const weibo=await saveWeibo(db,{id:input.id,body,status,published_at:input.published_at})
  revalidatePath('/weibo')
  revalidatePath('/')
  let indexing=null
  if(status==='published'||input.id){
   try{indexing=await notifyIndexNow(['/weibo','/'])}catch(error){indexing={accepted:false,error:error.message}}
  }
  return Response.json({weibo,indexing})
 }catch(error){
  return Response.json({error:error.message||'保存失败'},{status:400})
 }
}

export async function DELETE(request){
 const blocked=jsonMutationGuard(request,2048)
 if(blocked)return blocked
 const db=await createClient()
 const user=await getSiteAdmin(db)
 if(!user)return Response.json({error:'unauthorized'},{status:401})
 const parsed=await parseJsonBody(request,2048)
 if(parsed.response)return parsed.response
 const id=parsed.data?.id
 if(!validUuid(id))return Response.json({error:'无效的微博 ID'},{status:400})
 try{
  await deleteWeibo(db,id)
  revalidatePath('/weibo')
  revalidatePath('/')
  let indexing=null
  try{indexing=await notifyIndexNow(['/weibo','/'])}catch(error){indexing={accepted:false,error:error.message}}
  return Response.json({ok:true,indexing})
 }catch(error){
  return Response.json({error:error.message||'删除失败'},{status:400})
 }
}
