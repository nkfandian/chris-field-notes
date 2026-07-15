import {getIndexNowKey} from '@/lib/indexnow'

export const dynamic='force-dynamic'

export async function GET(_request,{params}){
  const requested=(await params).indexNowKey
  const key=getIndexNowKey()
  if(!key||requested!==`${key}.txt`)return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}})
  return new Response(key,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=86400','X-Robots-Tag':'noindex, nofollow'}})
}
