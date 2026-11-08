import {createClient,isConfigured} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'
import {getStudioBadgeCounts} from '@/lib/studio-badges'
import StudioNav from './studio-nav'
import './studio.css'

export const dynamic='force-dynamic'
export const metadata={title:'Studio',robots:{index:false,follow:false,nocache:true}}

export default async function StudioLayout({children}){
 let user=null
 let counts={comments:0,subscribers:0}
 if(isConfigured()){
  const db=await createClient()
  user=await getSiteAdmin(db)
  if(user)counts=await getStudioBadgeCounts(db)
 }
 return <>{user&&<StudioNav hideOnRoot counts={counts}/>}{children}</>
}
