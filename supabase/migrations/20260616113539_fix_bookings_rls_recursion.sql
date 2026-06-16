-- Fix infinite RLS recursion on public.bookings.
--
-- The bookings <-> booking_interests/booking_confirmations policies referenced
-- each other's RLS-protected tables, so evaluating a SELECT on bookings looped:
--   bookings.bookings_select_involved  -> EXISTS(... FROM booking_interests)
--   booking_interests.*_select_signer  -> EXISTS(... FROM bookings)
--   -> back into bookings policies -> "infinite recursion detected in policy".
-- This never fired until the first real bookings read landed (006 spike).
--
-- Break the cycle by moving the cross-table existence check in
-- bookings_select_involved into a SECURITY DEFINER function, which runs with
-- RLS bypassed so the subquery on booking_interests/booking_confirmations does
-- NOT re-trigger their policies. That removes the only mutual-reference loop:
-- the other direction (querying booking_interests, whose policies read bookings)
-- now resolves bookings_select_involved via this function without recursing.

create or replace function public.is_interested_or_confirmed(p_booking_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select
    exists (
      select 1 from public.booking_interests bi
      where bi.booking_id = p_booking_id and bi.interpreter_id = (select auth.uid())
    )
    or exists (
      select 1 from public.booking_confirmations bc
      where bc.booking_id = p_booking_id and bc.interpreter_id = (select auth.uid())
    );
$$;

revoke execute on function public.is_interested_or_confirmed(uuid) from anon;
grant execute on function public.is_interested_or_confirmed(uuid) to authenticated;

alter policy bookings_select_involved on public.bookings
  using (public.is_interested_or_confirmed(id));
