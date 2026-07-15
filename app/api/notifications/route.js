import {createClient as createSessionClient} from '@/lib/supabase/server'
import {deliverPending} from '@/lib/notifications'
import {getSiteAdmin} from '@/lib/auth'
import {originGuard} from '@/lib/security'
export const dynamic='force-dynamic'
async function response(){try{return Response.json(await deliverPending())}catch(error){return Response.json({error:error.message},{status:500})}}
export async function GET(request){if(request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return Response.json({error:'unauthorized'},{status:401});return response()}
export async function POST(request){const blocked=originGuard(request);if(blocked)return blocked;const session=await createSessionClient();if(!await getSiteAdmin(session))return Response.json({error:'unauthorized'},{status:401});return response()}
