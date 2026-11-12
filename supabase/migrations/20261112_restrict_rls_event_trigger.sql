-- The event trigger is owned and run by postgres. API roles do not need to
-- invoke its SECURITY DEFINER function directly through PostgREST.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
