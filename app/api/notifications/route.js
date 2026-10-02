import {createClient as createSessionClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {deliverPending} from '@/lib/notifications'
import {getSiteAdmin} from '@/lib/auth'
import {originGuard} from '@/lib/security'
export const dynamic='force-dynamic'
async function response(){try{return Response.json(await deliverPending())}catch(error){return Response.json({error:error.message},{status:500})}}
// 限流窗口最长 24 小时，两天前的桶已无用。
async function pruneRateLimits(){try{await createAdminClient().from('rate_limits').delete().lt('window_started_at',new Date(Date.now()-2*86400000).toISOString())}catch(error){console.error('rate limit prune failed',error)}}
// Vercel Cron 会携带 Bearer CRON_SECRET；未配置密钥时一律拒绝。
export async function GET(request){const secret=process.env.CRON_SECRET;if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return Response.json({error:'unauthorized'},{status:401});await pruneRateLimits();return response()}
export async function POST(request){const blocked=originGuard(request);if(blocked)return blocked;const session=await createSessionClient();if(!await getSiteAdmin(session))return Response.json({error:'unauthorized'},{status:401});return response()}
