-- Phase 02 security fix: the table-level INSERT/UPDATE grant on profiles let any
-- authenticated user set is_admin or clear suspended_at on their own row (RLS
-- only checks row ownership, not which columns change). Replace the blanket
-- grant with column-scoped privileges so privilege columns are server-only.

-- Drop the over-broad column privileges for the authenticated role.
revoke insert, update on public.profiles from authenticated;

-- Re-grant INSERT only on the columns onboarding legitimately writes
-- (apps/web/app/onboarding/actions.ts). id is the row key; the rest are user data.
-- Columns deliberately EXCLUDED: is_admin, suspended_at (privilege/state — server only).
grant insert (
  id, email, display_name, roles, active_role,
  location_suburb, location_postcode, location_state, location_lat, location_lng,
  sign_languages, preferred_contact, mobile, avatar_url,
  notification_email, notification_push, notification_sms,
  accepted_terms_at, tos_version
) on public.profiles to authenticated;

-- Re-grant UPDATE only on columns a user may edit later from a profile screen.
-- Same exclusions; email is excluded too (identity is owned by auth.users, not
-- user-editable here).
grant update (
  display_name, roles, active_role,
  location_suburb, location_postcode, location_state, location_lat, location_lng,
  sign_languages, preferred_contact, mobile, avatar_url,
  notification_email, notification_push, notification_sms
) on public.profiles to authenticated;

-- SELECT on the full row is unchanged (own-row RLS governs visibility).
-- service_role retains GRANT ALL from the initial schema (server-side admin paths).
