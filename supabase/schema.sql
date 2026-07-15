create extension if not exists "pgcrypto";
begin;
create table if not exists public.posts (id uuid primary key default gen_random_uuid(),slug text unique not null,title text not null,domain text not null check (domain in ('decode','execute','deploy','trek','roots')),excerpt text default '',body text default '',thesis text default '',tools text default '',status text not null default 'draft' check (status in ('draft','published')),published_at date default current_date,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.posts enable row level security;
create table if not exists public.site_content (key text primary key,value jsonb not null default '{}'::jsonb,updated_at timestamptz not null default now());
alter table public.site_content enable row level security;
create policy "site content is public" on public.site_content for select using (true);
create policy "authenticated author inserts site content" on public.site_content for insert to authenticated with check (true);
create policy "authenticated author updates site content" on public.site_content for update to authenticated using (true) with check (true);
insert into public.site_content(key,value) values ('home','{"hero_title":"我不展示答案。","hero_emphasis":"我记录理解发生的过程。","hero_deck":"一个实用主义者的公开工作台：在语言、商业、技术、身体与来处之间，寻找那些尚未被命名的连接。","manifesto":"保持好奇，但不把好奇误认为深刻；相信工具，但不把工具误认为能力；持续行动，同时给缓慢留下位置。"}'::jsonb) on conflict(key) do nothing;
create policy "published posts are public" on public.posts for select using (status = 'published' or auth.role() = 'authenticated');
create policy "authenticated author can insert" on public.posts for insert to authenticated with check (true);
create policy "authenticated author can update" on public.posts for update to authenticated using (true) with check (true);
create policy "authenticated author can delete" on public.posts for delete to authenticated using (true);
insert into public.posts (slug,title,domain,excerpt,thesis,tools,status,published_at) values ('formidable','从 formidable 的词根，看“恐惧”如何变成“强大”','decode','一个词的含义从来不是定义，而是一段被压缩过的社会经验。','语言像化石，保存着人类曾经害怕什么。','词源词典 × 3 / Gemini 辅助对照 / 42 min','published','2026-07-08'),('cola-cost','一罐可乐的成本，不在铝罐里','execute','把一个熟悉的消费品拆回供应链，重新理解品牌、渠道与规模。','利润不是售价减成本，而是系统里每个选择的残影。','公开财报 / 零售访谈 / 手工计算','published','2026-07-05'),('two-ai','我怎样让两个 AI 为同一个网站争论','deploy','一个负责主导，一个负责反驳；人的价值不在发言最多，而在最终取舍。','真正好用的 AI 工作流，最后看起来不像 AI。','Codex + Gemini / 17 次迭代 / 本地验证','published','2026-06-29') on conflict (slug) do nothing;
create table if not exists public.comments (id uuid primary key default gen_random_uuid(),kind text not null default 'comment' check (kind in ('comment','message')),post_slug text,name text not null check (char_length(name) between 1 and 60),email text not null check (char_length(email) between 3 and 160),body text not null check (char_length(body) between 2 and 2000),status text not null default 'pending' check (status in ('pending','approved','rejected')),created_at timestamptz not null default now(),reviewed_at timestamptz);
alter table public.comments enable row level security;
drop policy if exists "approved comments are public" on public.comments;
drop policy if exists "visitors can submit comments" on public.comments;
drop policy if exists "authenticated author can review comments" on public.comments;
drop policy if exists "authenticated author can delete comments" on public.comments;
create policy "approved comments are public" on public.comments for select using (status = 'approved' or auth.role() = 'authenticated');
create policy "visitors can submit comments" on public.comments for insert to anon,authenticated with check (status = 'pending');
create policy "authenticated author can review comments" on public.comments for update to authenticated using (true) with check (true);
create policy "authenticated author can delete comments" on public.comments for delete to authenticated using (true);
create index if not exists comments_post_slug_status_idx on public.comments(post_slug,status,created_at desc);
alter table public.posts add column if not exists firebase_id text unique;
alter table public.posts add column if not exists tags text[] not null default '{}';
alter table public.comments add column if not exists firebase_id text unique;
create table if not exists public.books (id uuid primary key default gen_random_uuid(),firebase_id text unique,title text not null,author text default '',cover_url text default '',status text not null default 'Reading' check (status in ('Reading','Read','To Read')),rating integer not null default 0 check (rating between 0 and 5),review text default '',language text not null default 'Chinese' check (language in ('Chinese','English')),custom_lists text[] not null default '{}',linked_post_slug text,sort_order integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.books enable row level security;
drop policy if exists "books are public" on public.books;
drop policy if exists "authenticated author inserts books" on public.books;
drop policy if exists "authenticated author updates books" on public.books;
drop policy if exists "authenticated author deletes books" on public.books;
create policy "books are public" on public.books for select using (true);
create policy "authenticated author inserts books" on public.books for insert to authenticated with check (true);
create policy "authenticated author updates books" on public.books for update to authenticated using (true) with check (true);
create policy "authenticated author deletes books" on public.books for delete to authenticated using (true);
create index if not exists books_sort_order_idx on public.books(sort_order,created_at desc);
create table if not exists public.subscribers (id uuid primary key default gen_random_uuid(),firebase_id text unique,email text not null unique,created_at timestamptz not null default now(),source text default 'firebase');
alter table public.subscribers enable row level security;
drop policy if exists "visitors can subscribe" on public.subscribers;
drop policy if exists "authenticated author reads subscribers" on public.subscribers;
create policy "visitors can subscribe" on public.subscribers for insert to anon,authenticated with check (true);
create policy "authenticated author reads subscribers" on public.subscribers for select to authenticated using (true);
drop policy if exists "authenticated author updates subscribers" on public.subscribers;
drop policy if exists "authenticated author deletes subscribers" on public.subscribers;
create policy "authenticated author updates subscribers" on public.subscribers for update to authenticated using (true) with check (true);
create policy "authenticated author deletes subscribers" on public.subscribers for delete to authenticated using (true);
alter table public.subscribers add column if not exists status text not null default 'active' check (status in ('active','unsubscribed'));
alter table public.subscribers add column if not exists updated_at timestamptz not null default now();
create table if not exists public.email_campaigns (id uuid primary key default gen_random_uuid(),subject text not null,body text not null,recipient_count integer not null default 0,status text not null default 'sending' check (status in ('sending','sent','partial','failed')),error text default '',created_by uuid,created_at timestamptz not null default now(),sent_at timestamptz);
alter table public.email_campaigns enable row level security;
drop policy if exists "authenticated author reads campaigns" on public.email_campaigns;
create policy "authenticated author reads campaigns" on public.email_campaigns for select to authenticated using (true);
alter table public.posts add column if not exists notification_sent_at timestamptz;
create table if not exists public.email_deliveries (id uuid primary key default gen_random_uuid(),post_id uuid not null references public.posts(id) on delete cascade,subscriber_id uuid not null references public.subscribers(id) on delete cascade,email text not null,status text not null default 'sending' check (status in ('sending','sent','failed')),provider_id text,error text default '',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(post_id,subscriber_id));
create index if not exists email_deliveries_post_status_idx on public.email_deliveries(post_id,status);
alter table public.email_deliveries enable row level security;
drop policy if exists "authenticated author reads deliveries" on public.email_deliveries;
create policy "authenticated author reads deliveries" on public.email_deliveries for select to authenticated using (true);

-- Public form hardening and verified subscription lifecycle.
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

create table if not exists public.rate_limits (
 key text primary key,
 hits integer not null default 0,
 window_started_at timestamptz not null default now()
);
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

-- Curated reading and thinking trails.
create table if not exists public.trails (
 id uuid primary key default gen_random_uuid(),
 slug text unique not null,
 title text not null,
 summary text default '',
 status text not null default 'draft' check (status in ('draft','published')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.trail_items (
 id uuid primary key default gen_random_uuid(),
 trail_id uuid not null references public.trails(id) on delete cascade,
 position integer not null default 0,
 item_type text not null check (item_type in ('post','book','note')),
 reference_id text default '',
 label text not null,
 note text default '',
 created_at timestamptz not null default now()
);
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

-- Finish every bootstrap in the same locked-down state as production. Keeping
-- this inside the transaction prevents the permissive compatibility policies
-- above from ever becoming externally visible during initial setup.
create table if not exists public.site_admins (user_id uuid primary key references auth.users(id) on delete cascade,created_at timestamptz not null default now());
alter table public.site_admins enable row level security;
insert into public.site_admins(user_id) select id from auth.users order by created_at asc limit 1 on conflict(user_id) do nothing;
create or replace function public.is_site_admin() returns boolean language sql stable security definer set search_path=public,auth as $$select exists(select 1 from public.site_admins where user_id=auth.uid())$$;
revoke all on function public.is_site_admin() from public,anon;
grant execute on function public.is_site_admin() to authenticated,service_role;
create or replace function public.get_public_comments(p_post_slug text) returns table(id uuid,name text,body text,created_at timestamptz) language sql stable security definer set search_path=public as $$select c.id,c.name,c.body,c.created_at from public.comments c where c.status='approved' and c.post_slug=p_post_slug and char_length(p_post_slug) between 1 and 180 order by c.created_at desc$$;
revoke all on function public.get_public_comments(text) from public;
grant execute on function public.get_public_comments(text) to anon,authenticated,service_role;

drop policy if exists "site content is public" on public.site_content;
drop policy if exists "authenticated author inserts site content" on public.site_content;
drop policy if exists "authenticated author updates site content" on public.site_content;
create policy "site content is public" on public.site_content for select using(true);
create policy "admin manages site content" on public.site_content for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
drop policy if exists "published posts are public" on public.posts;
drop policy if exists "authenticated author can insert" on public.posts;
drop policy if exists "authenticated author can update" on public.posts;
drop policy if exists "authenticated author can delete" on public.posts;
create policy "published posts are public" on public.posts for select using(status='published');
create policy "admin manages posts" on public.posts for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
drop policy if exists "approved comments are public" on public.comments;
drop policy if exists "visitors can submit comments" on public.comments;
drop policy if exists "authenticated author can review comments" on public.comments;
drop policy if exists "authenticated author can delete comments" on public.comments;
create policy "admin manages comments" on public.comments for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
drop policy if exists "books are public" on public.books;
drop policy if exists "authenticated author inserts books" on public.books;
drop policy if exists "authenticated author updates books" on public.books;
drop policy if exists "authenticated author deletes books" on public.books;
create policy "books are public" on public.books for select using(true);
create policy "admin manages books" on public.books for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
drop policy if exists "authenticated author reads subscribers" on public.subscribers;
drop policy if exists "authenticated author updates subscribers" on public.subscribers;
drop policy if exists "authenticated author deletes subscribers" on public.subscribers;
create policy "admin manages subscribers" on public.subscribers for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
drop policy if exists "authenticated author reads campaigns" on public.email_campaigns;
create policy "admin manages campaigns" on public.email_campaigns for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
drop policy if exists "authenticated author reads deliveries" on public.email_deliveries;
create policy "admin manages deliveries" on public.email_deliveries for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
drop policy if exists "published trails are public" on public.trails;
drop policy if exists "authenticated author manages trails" on public.trails;
create policy "published trails are public" on public.trails for select using(status='published');
create policy "admin manages trails" on public.trails for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
drop policy if exists "published trail items are public" on public.trail_items;
drop policy if exists "authenticated author manages trail items" on public.trail_items;
create policy "published trail items are public" on public.trail_items for select using(exists(select 1 from public.trails t where t.id=trail_items.trail_id and t.status='published'));
create policy "admin manages trail items" on public.trail_items for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
alter table public.subscribers add column if not exists confirmation_sent_at timestamptz;

revoke all on table public.comments,public.subscribers,public.email_campaigns,public.email_deliveries,public.rate_limits,public.site_admins from anon;
revoke all on table public.rate_limits,public.site_admins from authenticated;
grant select on table public.posts,public.site_content,public.books,public.trails,public.trail_items to anon,authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon;
commit;
