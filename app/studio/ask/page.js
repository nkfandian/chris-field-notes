import {redirect} from 'next/navigation'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'
import AskLogsClient from './ask-logs-client'
import '../studio.css'
import '../comments/moderation.css'

export const dynamic='force-dynamic'

export default async function StudioAskPage(){
 if(!isConfigured())return null
 const db=await createClient()
 if(!await getSiteAdmin(db))redirect('/studio')
 const {data,error}=await db.from('ask_logs').select('*').order('created_at',{ascending:false}).limit(200)
 const tableMissing=Boolean(error&&/ask_logs|does not exist|schema cache/i.test(error.message||''))
 return <AskLogsClient initial={data||[]} tableMissing={tableMissing} errorMessage={tableMissing?'':(error?.message||'')}/>
}
