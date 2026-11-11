import {createServerClient} from '@supabase/ssr'
import {createClient as createSupabaseClient} from '@supabase/supabase-js'
import {cookies} from 'next/headers'
export async function createClient(){
 const store=await cookies();
 return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll(){return store.getAll()},setAll(items){try{items.forEach(({name,value,options})=>store.set(name,value,options))}catch{}}}})
}
// 仅用于公开只读查询：不调用 cookies()，避免把带 revalidate 的页面强制降级为每次请求都查库的动态渲染。
export function createPublicClient(){
 return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
}
export const isConfigured=()=>Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
