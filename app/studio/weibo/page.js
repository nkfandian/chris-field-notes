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
 // 今日按数据库日期（UTC）取，与 record_weibo_view() 的 current_date 同口径。
 const todayStr=new Date().toISOString().slice(0,10)
 const [weibos,viewTotals,viewToday]=await Promise.all([
  listAdminWeibos(db).catch(()=>[]),
  db.from('weibo_views').select('weibo_id,view_count').then(r=>r.error?[]:(r.data||[])).catch(()=>[]),
  db.from('weibo_view_days').select('weibo_id,view_count').eq('view_date',todayStr).then(r=>r.error?[]:(r.data||[])).catch(()=>[])
 ])
 const totals=new Map((viewTotals||[]).map(row=>[row.weibo_id,Number(row.view_count)||0]))
 const today=new Map((viewToday||[]).map(row=>[row.weibo_id,Number(row.view_count)||0]))
 const withViews=(weibos||[]).map(item=>({...item,view_count:totals.get(item.id)||0,views_today:today.get(item.id)||0}))
 return <WeiboEditor initialWeibos={withViews}/>
}
