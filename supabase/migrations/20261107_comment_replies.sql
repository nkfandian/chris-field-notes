-- 评论回复：站长回复作为子评论挂在原评论下；公开读取的 RPC 同时返回 parent_id。
-- 注意：改返回类型不能用 create or replace（会报 42P13），须先 drop；drop 会连同授权一起删掉，建完要重新授权。
alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;
create index if not exists comments_parent_id_idx on public.comments(parent_id);
drop function if exists public.get_public_comments(text);
create function public.get_public_comments(p_post_slug text)
 returns table(id uuid,parent_id uuid,name text,body text,created_at timestamptz)
 language sql stable security definer set search_path=public as
 $$select c.id,c.parent_id,c.name,c.body,c.created_at from public.comments c where c.status='approved' and c.post_slug=p_post_slug and char_length(p_post_slug) between 1 and 180 order by c.created_at desc$$;
revoke all on function public.get_public_comments(text) from public;
grant execute on function public.get_public_comments(text) to anon,authenticated,service_role;
