-- Phase 02 follow-up: address Supabase security advisors on the initial schema.

-- 1. Pin search_path on the updated_at trigger function (function_search_path_mutable).
alter function public.set_updated_at() set search_path = '';

-- 2. is_admin() is an RLS helper, not meant to be a public RPC. Keep EXECUTE for
--    authenticated (RLS policies invoke it) + service_role, but revoke from
--    anon/PUBLIC so it isn't callable via /rest/v1/rpc/is_admin by anon.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;
