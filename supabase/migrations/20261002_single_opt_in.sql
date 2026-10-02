-- 订阅改为单次确认：提交邮箱即生效。
-- 把此前停留在“待确认”的订阅者全部设为有效。
update public.subscribers
set status='active',verified_at=coalesce(verified_at,now()),updated_at=now()
where status='pending';
