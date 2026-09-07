insert into public.site_content(key,value)
values (
  'about',
  '{"text":"我经历过博客、微博、豆瓣、FB、Goodreads等等数不清的平台，那里都曾留下过我的记录，这个独立的小站，会作为我阅读和记录的一个新空间，延续我在互联网的记忆。"}'::jsonb
)
on conflict(key) do nothing;
