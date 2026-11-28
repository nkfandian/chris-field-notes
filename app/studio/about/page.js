import {redirect} from 'next/navigation'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'
import {resolveAboutConfig} from '@/lib/about'
import AboutEditor from './about-editor'
import '../studio.css'

export const dynamic='force-dynamic'

export default async function AboutEditorPage(){
 if(!isConfigured())return null
 const db=await createClient()
 if(!await getSiteAdmin(db))redirect('/studio')
 const {data:aboutRow}=await db.from('site_content').select('value').eq('key','about').maybeSingle()
 return <AboutEditor initialConfig={resolveAboutConfig(aboutRow?.value||{})}/>
}
