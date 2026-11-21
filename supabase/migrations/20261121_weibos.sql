-- 新增微博（短内容）表 weibos 及权限策略
begin;

create table if not exists public.weibos (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  body text not null check (char_length(body) between 1 and 5000),
  status text not null default 'published' check (status in ('draft','published')),
  likes integer not null default 0 check (likes >= 0),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weibos_published_idx on public.weibos(status, published_at desc);

alter table public.weibos enable row level security;

drop policy if exists "published weibos are public" on public.weibos;
drop policy if exists "admin manages weibos" on public.weibos;

create policy "published weibos are public" on public.weibos
  for select using (status = 'published');

create policy "admin manages weibos" on public.weibos
  for all to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

grant select on table public.weibos to anon, authenticated;

commit;
