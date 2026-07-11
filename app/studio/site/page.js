import {redirect} from 'next/navigation'
import {createClient,isConfigured} from '@/lib/supabase/server'
import SiteEditor from './site-editor'
import '../studio.css'
export default async function SiteEditorPage(){if(!isConfigured())return null;const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/studio');const {data}=await db.from('site_content').select('value').eq('key','home').maybeSingle();return <SiteEditor initial={data?.value||{}}/>}
