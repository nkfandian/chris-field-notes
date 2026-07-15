begin;

-- Fail closed on malformed calls and prune expired rate-limit buckets so an
-- attacker cannot grow the operational table without bound.
create or replace function public.check_rate_limit(p_key text,p_limit integer,p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare current_row public.rate_limits;
begin
  if p_key !~ '^[0-9a-f]{64}$' or p_limit not between 1 and 1000 or p_window_seconds not between 1 and 604800 then
    return false;
  end if;
  if random()<0.01 then
    delete from public.rate_limits where window_started_at<now()-interval '8 days';
  end if;
  insert into public.rate_limits(key,hits,window_started_at) values(p_key,1,now())
  on conflict(key) do update set
    hits=case when public.rate_limits.window_started_at<now()-make_interval(secs=>p_window_seconds) then 1 else public.rate_limits.hits+1 end,
    window_started_at=case when public.rate_limits.window_started_at<now()-make_interval(secs=>p_window_seconds) then now() else public.rate_limits.window_started_at end
  returning * into current_row;
  return current_row.hits<=p_limit;
end $$;
revoke all on function public.check_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.check_rate_limit(text,integer,integer) to service_role;

create or replace function public.get_public_comments(p_post_slug text)
returns table(id uuid,name text,body text,created_at timestamptz)
language sql
stable
security definer
set search_path=public
as $$
  select c.id,c.name,c.body,c.created_at
  from public.comments c
  where c.status='approved' and c.post_slug=p_post_slug and char_length(p_post_slug) between 1 and 180
  order by c.created_at desc;
$$;
revoke all on function public.get_public_comments(text) from public;
grant execute on function public.get_public_comments(text) to anon,authenticated,service_role;

-- Anonymous visitors only receive explicitly public content. Public comments
-- go through the narrow RPC above, which deliberately excludes email/status.
revoke all on table public.comments,public.subscribers,public.email_campaigns,public.email_deliveries,public.rate_limits,public.site_admins from anon;
revoke all on table public.rate_limits,public.site_admins from authenticated;
grant select on table public.posts,public.site_content,public.books,public.trails,public.trail_items to anon,authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon;

commit;
