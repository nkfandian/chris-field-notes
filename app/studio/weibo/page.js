import {redirect} from 'next/navigation'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'
import {listAdminWeibos} from '@/lib/weibo'
import WeiboEditor from './weibo-editor'
import '../studio.css'
import '../markdown-editor.css'

export const dynamic='force-dynamic'

export default async function WeiboStudioPage(){
 if(!isConfigured())return null
 const db=await createClient()
 if(!await getSiteAdmin(db))redirect('/studio')
 const weibos=await listAdminWeibos(db).catch(()=>[])
 return <WeiboEditor initialWeibos={weibos||[]}/>
}
