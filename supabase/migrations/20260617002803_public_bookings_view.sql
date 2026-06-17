-- 006 OQ1 (launch blocker): close the open-booking privacy hole.
--
-- bookings_select_open let every authenticated user read the FULL open-booking
-- row — exact location_lat/lng, postcode, and free-text notes/description —
-- which 06_AUTH_SECURITY_PRIVACY.md forbids. Mirror the public_profiles pattern:
-- a coarse, security-definer view for the pool, and remove the table-level
-- open-select policy so the raw row is owner / involved / admin only.
--
-- Exposed (safe): id, title, coarse area (suburb + state), mode, date/time,
-- slots, status, created_at. Withheld: signer_id (neutrality), location_lat/lng
-- + postcode (exact location), notes + description (free text / PII).

create view public.public_bookings
with (security_invoker = false) -- definer: returns only the safe columns below, bypassing base-table RLS
as
select
  id,
  title,
  location_suburb,
  location_state,
  mode,
  booking_date,
  start_time,
  end_time,
  slots,
  status,
  created_at
from public.bookings
where status = 'open';

-- Supabase default privileges grant ALL to anon/authenticated on new public
-- objects. On a security-definer, auto-updatable view that's a hole (writes
-- would pass through to bookings bypassing RLS), so strip everything first and
-- grant back only SELECT.
revoke all on public.public_bookings from anon, authenticated;
grant select on public.public_bookings to authenticated;

-- Lock the base table: open bookings are no longer broadly readable as full
-- rows. Signers still read their own (bookings_select_own_signer), interpreters
-- read involved ones (bookings_select_involved), admins via bookings_select_admin.
-- The pool now reads public.public_bookings instead.
drop policy if exists bookings_select_open on public.bookings;
