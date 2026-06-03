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
