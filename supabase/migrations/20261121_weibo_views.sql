-- 微博浏览量统计：总表 weibo_views + 按日表 weibo_view_days，复用日志浏览量模式
begin;

create table if not exists public.weibo_views (
  weibo_id uuid primary key references public.weibos(id) on delete cascade,
  view_count bigint not null default 0 check (view_count >= 0),
  last_viewed_at timestamptz
);

alter table public.weibo_views enable row level security;
drop policy if exists "admin reads weibo views" on public.weibo_views;
create policy "admin reads weibo views"
on public.weibo_views for select to authenticated
using (public.is_site_admin());

revoke all on table public.weibo_views from public,anon;
grant select on table public.weibo_views to authenticated;

create table if not exists public.weibo_view_days (
  weibo_id uuid not null references public.weibos(id) on delete cascade,
  view_date date not null,
  view_count bigint not null default 0 check (view_count >= 0),
  primary key (weibo_id, view_date)
);

alter table public.weibo_view_days enable row level security;
drop policy if exists "admin reads weibo view days" on public.weibo_view_days;
create policy "admin reads weibo view days"
on public.weibo_view_days for select to authenticated
using (public.is_site_admin());

revoke all on table public.weibo_view_days from public,anon;
grant select on table public.weibo_view_days to authenticated;

create or replace function public.record_weibo_view(p_weibo_slug text)
returns bigint
language plpgsql
security definer
set search_path=public
as $$
declare total bigint;
begin
  if p_weibo_slug is null or p_weibo_slug !~* '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(p_weibo_slug)>180 then
    return 0;
  end if;

  insert into public.weibo_views(weibo_id,view_count,last_viewed_at)
  select w.id,1,now()
  from public.weibos w
  where lower(w.slug)=lower(p_weibo_slug) and w.status='published'
  on conflict(weibo_id) do update set
    view_count=public.weibo_views.view_count+1,
    last_viewed_at=excluded.last_viewed_at
  returning view_count into total;

  if total is not null then
    insert into public.weibo_view_days(weibo_id,view_date,view_count)
    select w.id,current_date,1
    from public.weibos w
    where lower(w.slug)=lower(p_weibo_slug) and w.status='published'
    on conflict(weibo_id,view_date) do update set
      view_count=public.weibo_view_days.view_count+1;
  end if;

  return coalesce(total,0);
end;
$$;

revoke all on function public.record_weibo_view(text) from public,anon,authenticated;
grant execute on function public.record_weibo_view(text) to service_role;

commit;
