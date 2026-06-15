/**
 * WaveTap core — platform-agnostic domain types and logic shared by web + native.
 * Derived from 02_USER_ROLES_AND_PROFILES.md, 03_BOOKING_FLOW.md, 05_DATA_MODEL.md.
 */

// ── Roles ──────────────────────────────────────────────────────────────────
// Two roles, both "signers" by community; differentiated by function.
export type Role = "signer" | "interpreter";

// ── Booking lifecycle ────────────────────────────────────────────────────────
export type BookingStatus =
  | "open" // live in the pool, accepting interest
  | "pending" // ≥1 interpreter interested, not yet confirmed
  | "confirmed" // signer selected interpreter(s), contacts exchanged
  | "expired" // date passed without confirmation
  | "cancelled"; // withdrawn before confirmation

export type BookingMode = "in_person" | "remote";

// ── Team composition (mixed-type team bookings ADR, 2026-05-22) ──────────────
// Each booking carries a `slots` array; each slot is "any" or "deaf".
export type SlotKind = "any" | "deaf";
export interface Slot {
  kind: SlotKind;
}

export const MIN_SLOTS = 1;
export const MAX_SLOTS = 10;

/** Server-side validation: a confirmation must satisfy the requested composition. */
export function isCompositionSatisfied(
  slots: Slot[],
  confirmed: { isDeafInterpreter: boolean }[],
): boolean {
  if (slots.length < MIN_SLOTS || slots.length > MAX_SLOTS) return false;
  if (confirmed.length !== slots.length) return false;
  const deafRequired = slots.filter((s) => s.kind === "deaf").length;
  const deafConfirmed = confirmed.filter((c) => c.isDeafInterpreter).length;
  return deafConfirmed >= deafRequired;
}

// ── Distance (booking pool radius filter, 006 spike OQ2) ─────────────────────
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Great-circle distance in kilometres between two lat/lng points (haversine).
 * Used to filter open bookings against an interpreter's working radius. O(1);
 * the pool applies it per-candidate after fetching. The scale path (PostGIS
 * geography + GIST + ST_DWithin) supersedes this past a few hundred open
 * bookings — see docs/design/booking-surface.md OQ2.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371; // mean Earth radius, km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ── Interpreter "live" gate (onboarding ADR, 2026-06-03) ─────────────────────
// An interpreter is only eligible for the pool once area + availability are set.
export function isInterpreterLive(profile: {
  workingRadiusKm: number | null;
  availabilityPattern: Record<string, unknown> | null;
}): boolean {
  const hasArea = typeof profile.workingRadiusKm === "number" && profile.workingRadiusKm > 0;
  const hasAvailability =
    profile.availabilityPattern != null && Object.keys(profile.availabilityPattern).length > 0;
  return hasArea && hasAvailability;
}
