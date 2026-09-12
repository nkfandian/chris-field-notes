begin;

create table if not exists public.post_views (
  post_id uuid primary key references public.posts(id) on delete cascade,
  view_count bigint not null default 0 check (view_count >= 0),
  last_viewed_at timestamptz
);

alter table public.post_views enable row level security;
drop policy if exists "admin reads post views" on public.post_views;
create policy "admin reads post views"
on public.post_views for select to authenticated
using (public.is_site_admin());

revoke all on table public.post_views from public,anon;
grant select on table public.post_views to authenticated;

create or replace function public.record_post_view(p_post_slug text)
returns bigint
language plpgsql
security definer
set search_path=public
as $$
declare total bigint;
begin
  if p_post_slug is null or p_post_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(p_post_slug)>180 then
    return 0;
  end if;

  insert into public.post_views(post_id,view_count,last_viewed_at)
  select p.id,1,now()
  from public.posts p
  where p.slug=p_post_slug and p.status='published'
  on conflict(post_id) do update set
    view_count=public.post_views.view_count+1,
    last_viewed_at=excluded.last_viewed_at
  returning view_count into total;

  return coalesce(total,0);
end;
$$;

revoke all on function public.record_post_view(text) from public,anon,authenticated;
grant execute on function public.record_post_view(text) to service_role;

commit;
