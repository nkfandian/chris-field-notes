-- 收紧 site_content 公开读取范围：匿名访客只能读取 home 和 about，
-- 避免 studio_seen_comments / studio_seen_subscribers 等后台状态时间戳通过 anon key 泄露。
begin;
drop policy if exists "site content is public" on public.site_content;
create policy "site content is public" on public.site_content
  for select using (key in ('home', 'about') or public.is_site_admin());
commit;
