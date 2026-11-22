import {createAdminClient} from '@/lib/supabase/admin'
import {createClient as createServerClient,isConfigured} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'
import {jsonMutationGuard,parseJsonBody,validUuid} from '@/lib/security'

export async function POST(request){
 try{
  if(!isConfigured())return Response.json({error:'服务未配置。'},{status:500})
  const blocked=jsonMutationGuard(request,4096);if(blocked)return blocked
  const parsed=await parseJsonBody(request,4096);if(parsed.response)return parsed.response
  const input=parsed.data
  if(!input||typeof input!=='object'||Array.isArray(input))return Response.json({error:'请求格式无效。'},{status:400})
  const db=await createServerClient()
  if(!await getSiteAdmin(db))return Response.json({error:'需要管理员登录。'},{status:401})
  const {action,id}=input
  if(action!=='delete'||!validUuid(id))return Response.json({error:'参数无效。'},{status:400})
  const admin=createAdminClient()
  const {error}=await admin.from('ask_logs').delete().eq('id',id)
  if(error)throw error
  return Response.json({ok:true,deleted:true})
 }catch(error){
  console.error('studio ask log action failed',error)
  return Response.json({error:'操作失败，请稍后重试。'},{status:500})
 }
}
