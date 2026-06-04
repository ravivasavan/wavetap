-- is_admin() had an explicit EXECUTE grant to anon (Supabase default privileges),
-- which `revoke from public` did not remove. Revoke it so the RLS helper isn't
-- callable via /rest/v1/rpc/is_admin by unauthenticated clients. authenticated
-- keeps EXECUTE (RLS policies invoke it).
revoke execute on function public.is_admin() from anon;
