import Link from 'next/link'
import {createAdminClient} from '@/lib/supabase/admin'
import '../../studio/studio.css'

export const dynamic='force-dynamic'
export default async function ConfirmSubscription({searchParams}){const token=(await searchParams)?.token;let ok=false;if(token){const db=createAdminClient();const {data}=await db.from('subscribers').update({status:'active',verified_at:new Date().toISOString(),confirmation_token:crypto.randomUUID(),updated_at:new Date().toISOString()}).eq('confirmation_token',token).eq('status','pending').select('id').maybeSingle();ok=Boolean(data)}return <main className="studio login"><p className="studio-mark">C/ SUBSCRIPTION</p><h1>{ok?'订阅已确认':'确认链接无效'}</h1><p className="auth-notice">{ok?'下一篇日志完成时，它会抵达你的邮箱。':'链接可能已经失效，或订阅已经被处理。'}</p><Link className="return-link" href="/">返回网站 →</Link></main>}
