import {redirect} from 'next/navigation'
import {createClient,isConfigured} from '@/lib/supabase/server'
import SubscriberManager from './subscriber-manager'
import '../studio.css'
import './subscribers.css'
export const dynamic='force-dynamic'
export default async function SubscribersPage(){if(!isConfigured())return null;const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/studio');const [{data:subscribers},{data:campaigns}]=await Promise.all([db.from('subscribers').select('*').order('created_at',{ascending:false}),db.from('email_campaigns').select('*').order('created_at',{ascending:false}).limit(20)]);return <SubscriberManager initial={subscribers||[]} campaigns={campaigns||[]}/>}
