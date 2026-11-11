-- Website messages are private. Keep them out of the public comment RPC even
-- if a message was submitted with a forged post_slug and later marked read.
begin;
update public.comments set post_slug=null where kind='message' and post_slug is not null;
alter table public.comments drop constraint if exists comments_message_has_no_post_slug;
alter table public.comments add constraint comments_message_has_no_post_slug
  check (kind <> 'message' or post_slug is null);

create or replace function public.get_public_comments(p_post_slug text)
 returns table(id uuid,parent_id uuid,name text,body text,created_at timestamptz)
 language sql stable security definer set search_path=public as
 $$select c.id,c.parent_id,c.name,c.body,c.created_at
   from public.comments c
   where c.kind='comment' and c.status='approved'
     and c.post_slug=p_post_slug and char_length(p_post_slug) between 1 and 180
   order by c.created_at desc$$;
revoke all on function public.get_public_comments(text) from public;
grant execute on function public.get_public_comments(text) to anon,authenticated,service_role;

-- The admin-only policy below already grants authenticated admins access to
-- all keys. Keep the public policy free of is_site_admin(): anon cannot EXECUTE
-- that function, and PostgreSQL may evaluate it even for key='home'.
drop policy if exists "site content is public" on public.site_content;
create policy "site content is public" on public.site_content
  for select to anon,authenticated using (key in ('home','about'));

-- Durable per-recipient state for manual campaigns. Old campaign rows remain
-- historical and are intentionally not backfilled as if they were sent.
alter table public.email_campaigns drop constraint if exists email_campaigns_status_check;
alter table public.email_campaigns add constraint email_campaigns_status_check
  check (status in ('preparing','sending','sent','partial','failed'));
create table if not exists public.email_campaign_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  subscriber_id uuid not null references public.subscribers(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','skipped')),
  provider_id text,
  error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campaign_id,subscriber_id)
);
create index if not exists email_campaign_deliveries_status_idx
  on public.email_campaign_deliveries(campaign_id,status);
alter table public.email_campaign_deliveries enable row level security;
drop policy if exists "admin manages campaign deliveries" on public.email_campaign_deliveries;
create policy "admin manages campaign deliveries" on public.email_campaign_deliveries
  for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());
revoke all on table public.email_campaign_deliveries from anon;
grant select on table public.email_campaign_deliveries to authenticated;
commit;
