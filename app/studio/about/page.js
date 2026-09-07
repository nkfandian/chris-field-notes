import {redirect} from 'next/navigation'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'
import {normalizeAbout} from '@/lib/about'
import AboutEditor from './about-editor'
import '../studio.css'

export default async function AboutEditorPage(){
 if(!isConfigured())return null
 const db=await createClient()
 if(!await getSiteAdmin(db))redirect('/studio')
 const [{data:aboutRow},{data:homeRow}]=await Promise.all([
  db.from('site_content').select('value').eq('key','about').maybeSingle(),
  db.from('site_content').select('value').eq('key','home').maybeSingle()
 ])
 return <AboutEditor initial={normalizeAbout(aboutRow?.value||{},homeRow?.value||{})}/>
}
