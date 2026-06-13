-- Atomic, idempotent onboarding commit. Replaces the two separate inserts in
-- completeOnboarding so a partial failure can't orphan a profiles row, and a
-- retry after partial success succeeds (ON CONFLICT DO UPDATE) instead of
-- dead-ending on a duplicate key. SECURITY INVOKER: runs as the caller, so the
-- own-row RLS WITH CHECK policies on both tables still apply.
--
-- All params carry defaults so the Supabase type generator marks them optional
-- (plpgsql params are otherwise typed as required + non-null in the generated
-- TS, which rejects the null/optional fields the caller legitimately omits).
-- The caller passes `undefined` for empty optional fields; supabase-js drops
-- those keys and Postgres applies the default below.
create or replace function public.complete_onboarding(
  p_email text default null,
  p_display_name text default null,
  p_roles text[] default null,
  p_active_role text default null,
  p_location_suburb text default null,
  p_location_postcode text default null,
  p_location_state text default null,
  p_location_lat numeric default null,
  p_location_lng numeric default null,
  p_preferred_contact text default null,
  p_mobile text default null,
  p_accepted_terms_at timestamptz default null,
  p_tos_version text default null,
  p_is_interpreter boolean default false,
  p_working_radius_km integer default 30,
  p_availability jsonb default '{}'::jsonb,
  p_bio text default null,
  p_is_deaf_interpreter boolean default false,
  p_accepts_remote boolean default true
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.profiles (
    id, email, display_name, roles, active_role,
    location_suburb, location_postcode, location_state, location_lat, location_lng,
    preferred_contact, mobile, accepted_terms_at, tos_version
  ) values (
    v_uid, p_email, p_display_name, p_roles, p_active_role,
    p_location_suburb, p_location_postcode, p_location_state, p_location_lat, p_location_lng,
    p_preferred_contact, p_mobile, p_accepted_terms_at, p_tos_version
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    roles = excluded.roles,
    active_role = excluded.active_role,
    location_suburb = excluded.location_suburb,
    location_postcode = excluded.location_postcode,
    location_state = excluded.location_state,
    location_lat = excluded.location_lat,
    location_lng = excluded.location_lng,
    preferred_contact = excluded.preferred_contact,
    mobile = excluded.mobile,
    accepted_terms_at = excluded.accepted_terms_at,
    tos_version = excluded.tos_version;

  if p_is_interpreter then
    insert into public.interpreter_profiles (
      id, working_radius_km, availability_pattern, bio, is_deaf_interpreter, accepts_remote
    ) values (
      v_uid, p_working_radius_km, p_availability, p_bio, p_is_deaf_interpreter, p_accepts_remote
    )
    on conflict (id) do update set
      working_radius_km = excluded.working_radius_km,
      availability_pattern = excluded.availability_pattern,
      bio = excluded.bio,
      is_deaf_interpreter = excluded.is_deaf_interpreter,
      accepts_remote = excluded.accepts_remote;
  end if;
end;
$$;

grant execute on function public.complete_onboarding(
  text, text, text[], text, text, text, text, numeric, numeric, text, text,
  timestamptz, text, boolean, integer, jsonb, text, boolean, boolean
) to authenticated;
