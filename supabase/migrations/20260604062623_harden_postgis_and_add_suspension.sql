-- Phase 02 closeout: clear remaining advisors + the admin-suspend spec gap.

-- 1. Relocate PostGIS out of the API-exposed public schema. Clears the
--    rls_disabled_in_public ERROR on spatial_ref_sys and the extension_in_public
--    WARN. Safe to drop+recreate: no table columns use geometry/geography types
--    yet (location is stored as numeric lat/lng; PostGIS is for query-time
--    ST_DWithin only). The `extensions` schema already exists and is not exposed
--    to the Data API.
drop extension if exists postgis cascade;
create extension if not exists postgis with schema extensions;

-- 2. Admin "Suspend account" flow (07_ADMIN_PANEL) had no backing column in the
--    data model. Add it. Suspension is set by admins (service_role / is_admin RLS)
--    and enforced at login + query layer; null = active.
alter table public.profiles add column if not exists suspended_at timestamptz;
