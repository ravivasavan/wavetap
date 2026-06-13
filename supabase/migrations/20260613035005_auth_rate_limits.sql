-- Fixed-window rate limiter for unauthenticated auth actions (OTP send/verify).
-- Written/read only by the server via the service-role key, so RLS denies all
-- access to anon/authenticated (no policies = no access under RLS).
create table if not exists public.auth_rate_limits (
  scope text not null,
  key text not null,
  window_start timestamptz not null default now(),
  count integer not null default 0,
  primary key (scope, key)
);
alter table public.auth_rate_limits enable row level security;
-- Supabase default privileges grant CRUD to anon/authenticated on new public
-- tables. RLS-with-no-policies already blocks them, but revoke explicitly so the
-- table is service-role-only at the grant layer too (defense in depth; clears
-- the "table grants to anon" security advisor).
revoke all on public.auth_rate_limits from anon, authenticated;
-- No policies: only service_role (which bypasses RLS) can touch it.
grant select, insert, update, delete on public.auth_rate_limits to service_role;
