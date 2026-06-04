# WaveTap — Data Model

## Overview

All data lives in Supabase (PostgreSQL). Every table is protected by Row Level Security (RLS). The schema is intentionally lean — the platform stores only what is needed to facilitate the match.

## Entity Relationship

```
users
  ├── profiles (1:1)
  ├── interpreter_profiles (1:1, optional)
  ├── bookings (1:many, as signer)
  ├── booking_interests (1:many, as interpreter)
  ├── notifications (1:many)
  └── reports (1:many, as reporter or reported)

bookings
  ├── booking_interests (1:many)
  └── booking_confirmations (1:many)
```

## Tables

### `profiles`

Core user profile. Every user has one.

```sql
create table profiles (
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
  roles text[] not null check (roles <@ array['signer', 'interpreter']),
  active_role text not null check (active_role in ('signer', 'interpreter')),
  avatar_url text,
  is_admin boolean not null default false,        -- admin flag (06 + 07); set only in DB, never via UI
  suspended_at timestamptz,                        -- admin "suspend account" (07); null = active
  notification_email boolean default true,
  notification_push boolean default true,
  notification_sms boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

> **RLS / privacy note (implemented Phase 02).** `profiles` and `interpreter_profiles`
> are **own-row-only** for the `authenticated` role — a user reads/writes only their
> own row. Other users' *public* fields are served through the
> `public_profiles` / `public_interpreter_profiles` views (safe columns only:
> display name, avatar, suburb, state, sign languages, roles / bio, accepts_remote,
> is_deaf_interpreter). This satisfies the booking-pool "read any profile" need
> while honouring `06`'s guarantee that email, mobile, postcode and exact lat/lng
> are **never** exposed to other users. Admins read/write all rows via the
> `is_admin()` RLS helper (and server-side via the service role).

### `interpreter_profiles`

Extended profile for users with the interpreter role. Optional — only exists if the user has `interpreter` in their roles array.

```sql
create table interpreter_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  working_radius_km integer not null default 30,
  availability_pattern jsonb not null default '{}',
  bio text,
  accepts_remote boolean default true,
  is_deaf_interpreter boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

**`availability_pattern` JSONB structure:**

```json
{
  "monday": { "available": true, "period": "daytime" },
  "tuesday": { "available": true, "period": "all_day" },
  "wednesday": { "available": false, "period": null },
  "thursday": { "available": true, "period": "evening" },
  "friday": { "available": true, "period": "daytime" },
  "saturday": { "available": false, "period": null },
  "sunday": { "available": false, "period": null }
}
```

Period values: `daytime` (8am–5pm), `evening` (5pm–10pm), `all_day`, `null` (not available).

### `bookings`

A booking request created by a Signer.

```sql
create table bookings (
  id uuid primary key default gen_random_uuid(),
  signer_id uuid not null references profiles(id) on delete cascade,
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
  slots jsonb not null default '[{"kind": "any"}]',
  -- Each slot: {"kind": "any" | "deaf"}. Array length 1–10.
  -- Replaces former `interpreters_needed` + `prefers_deaf_interpreter`.
  -- See 2026-05-22 mixed-type team bookings ADR for shape + validation rules.
  notes text,
  status text not null default 'open' check (status in ('open', 'pending', 'confirmed', 'expired', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### `booking_interests`

An interpreter expressing availability for a booking.

```sql
create table booking_interests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  interpreter_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(booking_id, interpreter_id)
);
```

### `booking_confirmations`

The signer's selection — which interpreter(s) were chosen.

```sql
create table booking_confirmations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  interpreter_id uuid not null references profiles(id) on delete cascade,
  signer_contact_shared text not null,
  interpreter_contact_shared text not null,
  confirmed_at timestamptz default now(),
  unique(booking_id, interpreter_id)
);
```

### `notifications`

In-app notification log. Mirrors what was sent via email/push/SMS.

```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
```

Notification types: `new_booking`, `interest_received`, `booking_confirmed`, `booking_filled`, `booking_cancelled`, `booking_expired`, `account_flagged`, `system`.

> Native push delivery relies on a `push_tokens` table (Expo push tokens, keyed by user + device/platform) — defined in `10_NOTIFICATIONS.md`. It is part of the data model but documented there alongside the dispatch logic.

### `reports`

User-to-user flagging system.

```sql
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  reported_id uuid not null references profiles(id) on delete cascade,
  booking_id uuid references bookings(id) on delete set null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'actioned', 'dismissed')),
  admin_notes text,
  created_at timestamptz default now(),
  reviewed_at timestamptz
);
```

### `banned_emails`

Admin-managed list of banned email addresses.

```sql
create table banned_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  reason text,
  banned_by uuid references profiles(id),
  created_at timestamptz default now()
);
```

## Row Level Security (RLS) Principles

- **Profiles:** Users can read any profile (needed for booking pool). Users can only update their own profile.
- **Interpreter profiles:** Same as profiles.
- **Bookings:** Open bookings are readable by all authenticated interpreters. Signers can only read/write their own bookings.
- **Booking interests:** Interpreters can insert interest for open bookings. Signers can read interests on their own bookings.
- **Booking confirmations:** Only the booking's signer can create confirmations. Both parties can read their own confirmations.
- **Notifications:** Users can only read their own notifications.
- **Reports:** Users can create reports. Only admins can read/update reports.
- **Banned emails:** Only admins can read/write.

## Indexes

```sql
create index idx_bookings_status on bookings(status);
create index idx_bookings_date on bookings(booking_date);
create index idx_bookings_mode on bookings(mode);
create index idx_bookings_location on bookings(location_lat, location_lng);
create index idx_booking_interests_booking on booking_interests(booking_id);
create index idx_booking_interests_interpreter on booking_interests(interpreter_id);
create index idx_notifications_user on notifications(user_id, read);
create index idx_reports_status on reports(status);
```

## Geospatial Note

For location-based matching (in-person bookings within interpreter radius), use the PostGIS extension available in Supabase:

```sql
create extension if not exists postgis;
```

This enables `ST_DWithin` queries to efficiently find bookings within an interpreter's working radius. The fuzzy 5km radius for display is handled on the frontend — the actual lat/lng is stored but never exposed to other users.
