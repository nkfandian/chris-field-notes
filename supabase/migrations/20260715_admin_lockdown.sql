begin;

-- The oldest existing Auth user is the original site owner. Capture that account
-- once, then use a private allow-list instead of trusting every authenticated user.
create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.site_admins enable row level security;
insert into public.site_admins(user_id)
select id from auth.users order by created_at asc limit 1
on conflict (user_id) do nothing;

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path=public,auth
as $$
  select exists(select 1 from public.site_admins where user_id=auth.uid());
$$;
revoke all on function public.is_site_admin() from public,anon;
grant execute on function public.is_site_admin() to authenticated,service_role;

-- Public comment reads go through this deliberately narrow function. Email and
-- moderation state never leave the database for anonymous visitors.
create or replace function public.get_public_comments(p_post_slug text)
returns table(id uuid,name text,body text,created_at timestamptz)
language sql
stable
security definer
set search_path=public
as $$
  select c.id,c.name,c.body,c.created_at
  from public.comments c
  where c.status='approved' and c.post_slug=p_post_slug
  order by c.created_at desc;
$$;
revoke all on function public.get_public_comments(text) from public;
grant execute on function public.get_public_comments(text) to anon,authenticated,service_role;

-- Lock all authoring and private operational data to the explicit admin account.
drop policy if exists "site content is public" on public.site_content;
drop policy if exists "authenticated author inserts site content" on public.site_content;
drop policy if exists "authenticated author updates site content" on public.site_content;
drop policy if exists "admin manages site content" on public.site_content;
create policy "site content is public" on public.site_content for select using (true);
create policy "admin manages site content" on public.site_content for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "published posts are public" on public.posts;
drop policy if exists "authenticated author can insert" on public.posts;
drop policy if exists "authenticated author can update" on public.posts;
drop policy if exists "authenticated author can delete" on public.posts;
drop policy if exists "admin manages posts" on public.posts;
create policy "published posts are public" on public.posts for select using (status='published');
create policy "admin manages posts" on public.posts for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "approved comments are public" on public.comments;
drop policy if exists "visitors can submit comments" on public.comments;
drop policy if exists "authenticated author can review comments" on public.comments;
drop policy if exists "authenticated author can delete comments" on public.comments;
drop policy if exists "admin manages comments" on public.comments;
create policy "admin manages comments" on public.comments for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "books are public" on public.books;
drop policy if exists "authenticated author inserts books" on public.books;
drop policy if exists "authenticated author updates books" on public.books;
drop policy if exists "authenticated author deletes books" on public.books;
drop policy if exists "admin manages books" on public.books;
create policy "books are public" on public.books for select using (true);
create policy "admin manages books" on public.books for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "authenticated author reads subscribers" on public.subscribers;
drop policy if exists "authenticated author updates subscribers" on public.subscribers;
drop policy if exists "authenticated author deletes subscribers" on public.subscribers;
drop policy if exists "admin manages subscribers" on public.subscribers;
create policy "admin manages subscribers" on public.subscribers for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "authenticated author reads campaigns" on public.email_campaigns;
drop policy if exists "admin manages campaigns" on public.email_campaigns;
create policy "admin manages campaigns" on public.email_campaigns for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "authenticated author reads deliveries" on public.email_deliveries;
drop policy if exists "admin manages deliveries" on public.email_deliveries;
create policy "admin manages deliveries" on public.email_deliveries for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "published trails are public" on public.trails;
drop policy if exists "authenticated author manages trails" on public.trails;
drop policy if exists "admin manages trails" on public.trails;
create policy "published trails are public" on public.trails for select using (status='published');
create policy "admin manages trails" on public.trails for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "published trail items are public" on public.trail_items;
drop policy if exists "authenticated author manages trail items" on public.trail_items;
drop policy if exists "admin manages trail items" on public.trail_items;
create policy "published trail items are public" on public.trail_items for select using (exists(select 1 from public.trails t where t.id=trail_items.trail_id and t.status='published'));
create policy "admin manages trail items" on public.trail_items for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

-- Avoid repeatedly sending confirmation mail to the same address.
alter table public.subscribers add column if not exists confirmation_sent_at timestamptz;

commit;
