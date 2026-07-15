import {createClient,isConfigured} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'
import StudioNav from './studio-nav'
import './studio.css'

export const dynamic='force-dynamic'

export default async function StudioLayout({children}){
 let user=null
 if(isConfigured()){
  const db=await createClient()
  user=await getSiteAdmin(db)
 }
 return <>{user&&<StudioNav hideOnRoot/>}{children}</>
}
