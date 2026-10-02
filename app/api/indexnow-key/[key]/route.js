import {getIndexNowKey} from '@/lib/indexnow'

export const dynamic='force-dynamic'

// 公开地址 /{key}.txt 由 next.config.mjs 的 rewrite 转到这里。
// 不再使用根目录动态路由，避免所有一级路径的 404 都落到这个接口。
export async function GET(_request,{params}){
  const requested=(await params).key
  const key=getIndexNowKey()
  if(!key||requested!==key)return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}})
  return new Response(key,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=86400','X-Robots-Tag':'noindex, nofollow'}})
}
