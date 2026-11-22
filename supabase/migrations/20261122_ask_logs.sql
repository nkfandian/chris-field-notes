-- AI 作者对话记录表 ask_logs（仅管理员可读删，服务端写入，不存明文 IP）
begin;

create table if not exists public.ask_logs (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 1 and 500),
  answer text not null default '',
  mode text not null default 'ai' check (mode in ('ai','extractive','empty')),
  ai_status text,
  source_count integer not null default 0 check (source_count >= 0),
  sources jsonb not null default '[]'::jsonb,
  session_hash text,
  created_at timestamptz not null default now()
);

create index if not exists ask_logs_created_idx on public.ask_logs(created_at desc);

alter table public.ask_logs enable row level security;

drop policy if exists "admin manages ask_logs" on public.ask_logs;
create policy "admin manages ask_logs" on public.ask_logs
  for all to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

commit;
