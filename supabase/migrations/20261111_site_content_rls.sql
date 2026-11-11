-- 收紧 site_content 公开读取范围：匿名访客只能读取 home 和 about。
-- 管理员读取其它 key 由已存在的 "admin manages site content" 策略放行；
-- 不能在 anon 策略里调用 is_site_admin()，因为 anon 没有该函数的 EXECUTE 权限。
begin;
drop policy if exists "site content is public" on public.site_content;
create policy "site content is public" on public.site_content
  for select to anon,authenticated using (key in ('home', 'about'));
commit;
