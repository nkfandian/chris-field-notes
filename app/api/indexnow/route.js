import {createClient} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'
import {notifyIndexNow} from '@/lib/indexnow'
import {jsonMutationGuard,parseJsonBody} from '@/lib/security'
import {revalidatePath} from 'next/cache'

export async function POST(request){
  const blocked=jsonMutationGuard(request,4096)
  if(blocked)return blocked
  const db=await createClient()
  if(!await getSiteAdmin(db))return Response.json({error:'unauthorized'},{status:401})
  const parsed=await parseJsonBody(request,4096)
  if(parsed.response)return parsed.response
  const paths=Array.isArray(parsed.data?.paths)?parsed.data.paths.filter(path=>typeof path==='string'&&path.startsWith('/')&&!path.startsWith('//')).slice(0,20):[]
  if(!paths.length)return Response.json({error:'没有可提交的地址'},{status:400})
  for(const path of paths)revalidatePath(path.split('#')[0].split('?')[0])
  try{return Response.json(await notifyIndexNow(paths),{headers:{'Cache-Control':'no-store'}})}catch(error){return Response.json({accepted:false,error:error.message},{status:502,headers:{'Cache-Control':'no-store'}})}
}
