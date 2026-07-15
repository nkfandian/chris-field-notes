import {redirect} from 'next/navigation'
import {createClient,isConfigured} from '@/lib/supabase/server'
import SiteEditor from './site-editor'
import {getSiteAdmin} from '@/lib/auth'
import '../studio.css'
export default async function SiteEditorPage(){if(!isConfigured())return null;const db=await createClient();if(!await getSiteAdmin(db))redirect('/studio');const {data}=await db.from('site_content').select('value').eq('key','home').maybeSingle();return <SiteEditor initial={data?.value||{}}/>}
