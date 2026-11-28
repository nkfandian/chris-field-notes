import {revalidatePath} from 'next/cache'
import {createAdminClient} from '@/lib/supabase/admin'
import {createClient as createServerClient,isConfigured} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'
import {cleanText,jsonMutationGuard,parseJsonBody} from '@/lib/security'
import {DEFAULT_ABOUT_CONFIG} from '@/lib/about'

export async function POST(request){
 try{
  if(!isConfigured())return Response.json({error:'服务未配置。'},{status:500})
  const blocked=jsonMutationGuard(request,65536)
  if(blocked)return blocked
  const parsed=await parseJsonBody(request,65536)
  if(parsed.response)return parsed.response
  const db=await createServerClient()
  if(!await getSiteAdmin(db))return Response.json({error:'需要管理员登录。'},{status:401})

  const raw=parsed.data||{}
  const sections=Array.isArray(raw.sections)
   ?raw.sections.slice(0,12).map((sec,idx)=>({
    id:cleanText(sec?.id||`sec-${idx+1}`,48)||`sec-${idx+1}`,
    badge:cleanText(sec?.badge,60),
    title:cleanText(sec?.title,120),
    body:cleanText(sec?.body,2000),
    actions:Array.isArray(sec?.actions)
     ?sec.actions.slice(0,5).map(a=>({
      label:cleanText(a?.label,48),
      href:cleanText(a?.href,200),
      primary:Boolean(a?.primary)
     })).filter(a=>a.label&&a.href)
     :[]
   })).filter(s=>s.title||s.body)
   :DEFAULT_ABOUT_CONFIG.sections

  const payload={
   version:2,
   headline:cleanText(raw.headline,120)||DEFAULT_ABOUT_CONFIG.headline,
   intro:cleanText(raw.intro,2000)||DEFAULT_ABOUT_CONFIG.intro,
   guideLead:cleanText(raw.guideLead,240),
   text:cleanText(raw.intro,2000)||DEFAULT_ABOUT_CONFIG.intro,
   sections
  }

  const admin=createAdminClient()
  const {error}=await admin.from('site_content').upsert({
   key:'about',
   value:payload,
   updated_at:new Date().toISOString()
  })
  if(error)throw error

  try{
   revalidatePath('/about')
   revalidatePath('/')
  }catch{}

  return Response.json({ok:true,value:payload})
 }catch(error){
  console.error('save about failed',error)
  return Response.json({error:'保存失败，请稍后重试。'},{status:500})
 }
}
