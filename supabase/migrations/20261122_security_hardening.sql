-- 安全与限流加固：
-- 1) rate_limits 增加 expires_at，避免 10 年期微博浏览去重键被 2/8 天清理任务误删
-- 2) email_campaigns 增加 is_public 开关（默认 false），仅允许显式公开的专刊出现在 /newsletter
begin;

alter table public.rate_limits
  add column if not exists expires_at timestamptz;

update public.rate_limits
  set expires_at = window_started_at + interval '2 days'
  where expires_at is null;

create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare current_row public.rate_limits;
begin
  if random() < 0.02 then
    delete from public.rate_limits
    where coalesce(expires_at, window_started_at + interval '8 days') < now();
  end if;
  insert into public.rate_limits(key, hits, window_started_at, expires_at)
  values (p_key, 1, now(), now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    hits = case
      when public.rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds) then 1
      else public.rate_limits.hits + 1
    end,
    window_started_at = case
      when public.rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds) then now()
      else public.rate_limits.window_started_at
    end,
    expires_at = case
      when public.rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds) then now() + make_interval(secs => p_window_seconds)
      else greatest(coalesce(public.rate_limits.expires_at, now()), now() + make_interval(secs => p_window_seconds))
    end
  returning * into current_row;
  return current_row.hits <= p_limit;
end;
$$;

alter table public.email_campaigns
  add column if not exists is_public boolean not null default false;

commit;
