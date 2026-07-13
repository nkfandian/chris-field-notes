begin;

alter table public.subscribers add column if not exists verified_at timestamptz;
alter table public.subscribers add column if not exists confirmation_token uuid not null default gen_random_uuid();
alter table public.subscribers add column if not exists manage_token uuid not null default gen_random_uuid();
update public.subscribers set verified_at=coalesce(verified_at,created_at),status='active' where source='firebase' or status='active';
alter table public.subscribers drop constraint if exists subscribers_status_check;
alter table public.subscribers add constraint subscribers_status_check check (status in ('pending','active','unsubscribed'));
create unique index if not exists subscribers_confirmation_token_idx on public.subscribers(confirmation_token);
create unique index if not exists subscribers_manage_token_idx on public.subscribers(manage_token);
drop policy if exists "visitors can subscribe" on public.subscribers;
drop policy if exists "visitors can submit comments" on public.comments;

create table if not exists public.rate_limits (key text primary key,hits integer not null default 0,window_started_at timestamptz not null default now());
alter table public.rate_limits enable row level security;
create or replace function public.check_rate_limit(p_key text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare current_row public.rate_limits;
begin
 insert into public.rate_limits(key,hits,window_started_at) values(p_key,1,now())
 on conflict(key) do update set
  hits=case when public.rate_limits.window_started_at < now()-(p_window_seconds||' seconds')::interval then 1 else public.rate_limits.hits+1 end,
  window_started_at=case when public.rate_limits.window_started_at < now()-(p_window_seconds||' seconds')::interval then now() else public.rate_limits.window_started_at end
 returning * into current_row;
 return current_row.hits<=p_limit;
end $$;
revoke all on function public.check_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.check_rate_limit(text,integer,integer) to service_role;

create table if not exists public.trails (id uuid primary key default gen_random_uuid(),slug text unique not null,title text not null,summary text default '',status text not null default 'draft' check (status in ('draft','published')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.trail_items (id uuid primary key default gen_random_uuid(),trail_id uuid not null references public.trails(id) on delete cascade,position integer not null default 0,item_type text not null check (item_type in ('post','book','note')),reference_id text default '',label text not null,note text default '',created_at timestamptz not null default now());
create index if not exists trail_items_order_idx on public.trail_items(trail_id,position);
alter table public.trails enable row level security;
alter table public.trail_items enable row level security;
drop policy if exists "published trails are public" on public.trails;
drop policy if exists "authenticated author manages trails" on public.trails;
drop policy if exists "published trail items are public" on public.trail_items;
drop policy if exists "authenticated author manages trail items" on public.trail_items;
create policy "published trails are public" on public.trails for select using (status='published' or auth.role()='authenticated');
create policy "authenticated author manages trails" on public.trails for all to authenticated using (true) with check (true);
create policy "published trail items are public" on public.trail_items for select using (exists(select 1 from public.trails where trails.id=trail_items.trail_id and (trails.status='published' or auth.role()='authenticated')));
create policy "authenticated author manages trail items" on public.trail_items for all to authenticated using (true) with check (true);

commit;
