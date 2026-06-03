-- WaveTap — initial schema (Phase 02)
-- Source of truth: 05_DATA_MODEL.md, with auth/privacy from 06, admin from 07,
-- push_tokens from 10. Project config (2026-06-03 ADR): "auto-expose new tables"
-- is OFF, so Data API grants are explicit per table; "auto RLS" is ON, but we
-- still enable RLS + write policies explicitly so the schema is self-contained
-- and reproducible (CI branch dbs, local stacks, fresh restores).
--
-- Deviations from 05_DATA_MODEL.md, all to honour the specs they cite:
--   * profiles.is_admin added (06 + 07 require an admin flag on the profile).
--   * profiles / interpreter_profiles are OWN-ROW-ONLY under RLS; the booking
--     pool reads other users via the public_profiles / public_interpreter_profiles
--     views (safe columns only). 05's "read any profile" RLS principle conflicts
--     with 06's "email/mobile/exact location never exposed to other users" — the
--     view split satisfies both. Sensitive fields (email, mobile, postcode,
--     lat/lng, prefs) stay readable only by the owner (+ admin / service_role).

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists postgis;

-- ============================================================
-- Shared trigger function: touch updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- profiles (1:1 with auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  mobile text,
  location_suburb text,
  location_postcode text,
  location_state text,
  location_lat numeric,
  location_lng numeric,
  sign_languages text[] default '{"auslan"}',
  preferred_contact text not null default 'email' check (preferred_contact in ('email', 'mobile', 'both')),
  roles text[] not null check (roles <@ array['signer', 'interpreter'] and array_length(roles, 1) >= 1),
  active_role text not null check (active_role in ('signer', 'interpreter')),
  avatar_url text,
  is_admin boolean not null default false,
  notification_email boolean default true,
  notification_push boolean default true,
  notification_sms boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Admin check. SECURITY DEFINER so it reads profiles.is_admin without tripping
-- profiles' own RLS (avoids recursion). search_path pinned. Defined after
-- profiles so the function body validates.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- ============================================================
-- interpreter_profiles (1:1 with profiles, optional)
-- ============================================================
create table if not exists public.interpreter_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  working_radius_km integer not null default 30,
  availability_pattern jsonb not null default '{}',
  bio text,
  accepts_remote boolean default true,
  is_deaf_interpreter boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger trg_interpreter_profiles_updated_at
  before update on public.interpreter_profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- bookings (created by a signer)
-- ============================================================
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  signer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  booking_date date not null,
  start_time time not null,
  end_time time,
  mode text not null check (mode in ('in_person', 'remote')),
  location_suburb text,
  location_postcode text,
  location_state text,
  location_lat numeric,
  location_lng numeric,
  slots jsonb not null default '[{"kind": "any"}]'
    check (jsonb_typeof(slots) = 'array' and jsonb_array_length(slots) between 1 and 10),
  notes text,
  status text not null default 'open'
    check (status in ('open', 'pending', 'confirmed', 'expired', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger trg_bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_bookings_date on public.bookings(booking_date);
create index if not exists idx_bookings_mode on public.bookings(mode);
create index if not exists idx_bookings_location on public.bookings(location_lat, location_lng);
create index if not exists idx_bookings_signer on public.bookings(signer_id);

-- ============================================================
-- booking_interests (interpreter expresses availability)
-- ============================================================
create table if not exists public.booking_interests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  interpreter_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (booking_id, interpreter_id)
);

create index if not exists idx_booking_interests_booking on public.booking_interests(booking_id);
create index if not exists idx_booking_interests_interpreter on public.booking_interests(interpreter_id);

-- ============================================================
-- booking_confirmations (signer's selection)
-- ============================================================
create table if not exists public.booking_confirmations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  interpreter_id uuid not null references public.profiles(id) on delete cascade,
  signer_contact_shared text not null,
  interpreter_contact_shared text not null,
  confirmed_at timestamptz default now(),
  unique (booking_id, interpreter_id)
);

create index if not exists idx_booking_confirmations_booking on public.booking_confirmations(booking_id);
create index if not exists idx_booking_confirmations_interpreter on public.booking_confirmations(interpreter_id);

-- ============================================================
-- notifications (in-app log; mirrors email/push/SMS)
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id, read);

-- ============================================================
-- push_tokens (Expo push tokens, keyed by user + device) — see 10_NOTIFICATIONS
-- ============================================================
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  device_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, expo_push_token)
);

create trigger trg_push_tokens_updated_at
  before update on public.push_tokens
  for each row execute function public.set_updated_at();

create index if not exists idx_push_tokens_user on public.push_tokens(user_id);

-- ============================================================
-- reports (user-to-user flagging)
-- ============================================================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'actioned', 'dismissed')),
  admin_notes text,
  created_at timestamptz default now(),
  reviewed_at timestamptz
);

create index if not exists idx_reports_status on public.reports(status);

-- ============================================================
-- banned_emails (admin-managed)
-- ============================================================
create table if not exists public.banned_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  reason text,
  banned_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ============================================================
-- admin_audit_log (moderation audit trail) — see 07_ADMIN_PANEL
-- ============================================================
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_admin_audit_log_admin on public.admin_audit_log(admin_id);

-- ============================================================
-- Public directory views (safe columns only; owner-privileged so the pool can
-- read other users without exposing email / mobile / postcode / exact lat-lng).
-- ============================================================
create or replace view public.public_profiles as
  select
    id,
    display_name,
    avatar_url,
    location_suburb,
    location_state,
    sign_languages,
    roles,
    created_at
  from public.profiles;

create or replace view public.public_interpreter_profiles as
  select
    id,
    bio,
    accepts_remote,
    is_deaf_interpreter
  from public.interpreter_profiles;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.interpreter_profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_interests enable row level security;
alter table public.booking_confirmations enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.reports enable row level security;
alter table public.banned_emails enable row level security;
alter table public.admin_audit_log enable row level security;

-- profiles: own row (full); admins via is_admin(); others read via public_profiles view.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select to authenticated using (public.is_admin());
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- interpreter_profiles: same shape as profiles.
drop policy if exists interpreter_profiles_select_own on public.interpreter_profiles;
create policy interpreter_profiles_select_own on public.interpreter_profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists interpreter_profiles_select_admin on public.interpreter_profiles;
create policy interpreter_profiles_select_admin on public.interpreter_profiles
  for select to authenticated using (public.is_admin());
drop policy if exists interpreter_profiles_insert_own on public.interpreter_profiles;
create policy interpreter_profiles_insert_own on public.interpreter_profiles
  for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists interpreter_profiles_update_own on public.interpreter_profiles;
create policy interpreter_profiles_update_own on public.interpreter_profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- bookings: signer reads/writes own; interpreters read open bookings + any they're
-- involved in (interest or confirmation); admins read all.
drop policy if exists bookings_select_own_signer on public.bookings;
create policy bookings_select_own_signer on public.bookings
  for select to authenticated using (signer_id = (select auth.uid()));
drop policy if exists bookings_select_open on public.bookings;
create policy bookings_select_open on public.bookings
  for select to authenticated using (status = 'open');
drop policy if exists bookings_select_involved on public.bookings;
create policy bookings_select_involved on public.bookings
  for select to authenticated using (
    exists (
      select 1 from public.booking_interests bi
      where bi.booking_id = bookings.id and bi.interpreter_id = (select auth.uid())
    )
    or exists (
      select 1 from public.booking_confirmations bc
      where bc.booking_id = bookings.id and bc.interpreter_id = (select auth.uid())
    )
  );
drop policy if exists bookings_select_admin on public.bookings;
create policy bookings_select_admin on public.bookings
  for select to authenticated using (public.is_admin());
drop policy if exists bookings_insert_own on public.bookings;
create policy bookings_insert_own on public.bookings
  for insert to authenticated with check (signer_id = (select auth.uid()));
drop policy if exists bookings_update_own on public.bookings;
create policy bookings_update_own on public.bookings
  for update to authenticated using (signer_id = (select auth.uid())) with check (signer_id = (select auth.uid()));
drop policy if exists bookings_update_admin on public.bookings;
create policy bookings_update_admin on public.bookings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists bookings_delete_own on public.bookings;
create policy bookings_delete_own on public.bookings
  for delete to authenticated using (signer_id = (select auth.uid()));

-- booking_interests: interpreter inserts interest on OPEN bookings; interpreter reads
-- own; signer reads interests on own bookings; interpreter can withdraw own; admin reads.
drop policy if exists booking_interests_insert_own on public.booking_interests;
create policy booking_interests_insert_own on public.booking_interests
  for insert to authenticated with check (
    interpreter_id = (select auth.uid())
    and exists (select 1 from public.bookings b where b.id = booking_id and b.status = 'open')
  );
drop policy if exists booking_interests_select_own on public.booking_interests;
create policy booking_interests_select_own on public.booking_interests
  for select to authenticated using (interpreter_id = (select auth.uid()));
drop policy if exists booking_interests_select_signer on public.booking_interests;
create policy booking_interests_select_signer on public.booking_interests
  for select to authenticated using (
    exists (select 1 from public.bookings b where b.id = booking_id and b.signer_id = (select auth.uid()))
  );
drop policy if exists booking_interests_select_admin on public.booking_interests;
create policy booking_interests_select_admin on public.booking_interests
  for select to authenticated using (public.is_admin());
drop policy if exists booking_interests_delete_own on public.booking_interests;
create policy booking_interests_delete_own on public.booking_interests
  for delete to authenticated using (interpreter_id = (select auth.uid()));

-- booking_confirmations: only the booking's signer creates; both parties read own; admin reads.
drop policy if exists booking_confirmations_insert_signer on public.booking_confirmations;
create policy booking_confirmations_insert_signer on public.booking_confirmations
  for insert to authenticated with check (
    exists (select 1 from public.bookings b where b.id = booking_id and b.signer_id = (select auth.uid()))
  );
drop policy if exists booking_confirmations_select_party on public.booking_confirmations;
create policy booking_confirmations_select_party on public.booking_confirmations
  for select to authenticated using (
    interpreter_id = (select auth.uid())
    or exists (select 1 from public.bookings b where b.id = booking_id and b.signer_id = (select auth.uid()))
  );
drop policy if exists booking_confirmations_select_admin on public.booking_confirmations;
create policy booking_confirmations_select_admin on public.booking_confirmations
  for select to authenticated using (public.is_admin());

-- notifications: users read + update (mark read) their own. Inserts are server-side (service_role).
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- push_tokens: users manage their own. Pruning of stale tokens is server-side (service_role).
drop policy if exists push_tokens_select_own on public.push_tokens;
create policy push_tokens_select_own on public.push_tokens
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists push_tokens_insert_own on public.push_tokens;
create policy push_tokens_insert_own on public.push_tokens
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists push_tokens_update_own on public.push_tokens;
create policy push_tokens_update_own on public.push_tokens
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists push_tokens_delete_own on public.push_tokens;
create policy push_tokens_delete_own on public.push_tokens
  for delete to authenticated using (user_id = (select auth.uid()));

-- reports: any user files a report (as themselves); only admins read/update.
drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));
drop policy if exists reports_select_admin on public.reports;
create policy reports_select_admin on public.reports
  for select to authenticated using (public.is_admin());
drop policy if exists reports_update_admin on public.reports;
create policy reports_update_admin on public.reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- banned_emails: admin-only. Pre-auth login checks run server-side via service_role.
drop policy if exists banned_emails_all_admin on public.banned_emails;
create policy banned_emails_all_admin on public.banned_emails
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- admin_audit_log: admins read; inserts are server-side (service_role).
drop policy if exists admin_audit_log_select_admin on public.admin_audit_log;
create policy admin_audit_log_select_admin on public.admin_audit_log
  for select to authenticated using (public.is_admin());

-- ============================================================
-- Data API grants (auto-expose is OFF — grant explicitly per table).
-- anon gets nothing (everything is auth-gated). authenticated gets the verbs its
-- RLS policies allow. service_role bypasses RLS and is granted broadly for the
-- server-side admin / Edge Function paths.
-- ============================================================
grant usage on schema public to authenticated, service_role;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.interpreter_profiles to authenticated;
grant select, insert, update, delete on public.bookings to authenticated;
grant select, insert, delete on public.booking_interests to authenticated;
grant select, insert on public.booking_confirmations to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert, update, delete on public.push_tokens to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select, insert, update, delete on public.banned_emails to authenticated;
grant select on public.admin_audit_log to authenticated;

grant select on public.public_profiles to authenticated;
grant select on public.public_interpreter_profiles to authenticated;

-- service_role: full access for server-side admin + Edge Functions (bypasses RLS).
grant all on all tables in schema public to service_role;
