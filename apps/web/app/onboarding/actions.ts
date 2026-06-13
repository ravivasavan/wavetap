"use server";

import { redirect } from "next/navigation";

import { geocodeAU } from "@/lib/geocode";
import { createClient } from "@/lib/supabase/server";

import { activeRoleFromMode, rolesFromMode, type OnboardingState } from "./types";

const TOS_VERSION = "2026-06-04";

export type CompleteResult = { error: string } | void;

/**
 * Commits the whole onboarding wizard in one go: inserts the profiles row (and
 * interpreter_profiles when applicable) under the user's own session (RLS
 * own-row insert). profiles has NOT NULL / CHECK constraints (display_name,
 * roles, active_role) so there's no valid half-row to write mid-flow — hence
 * the single final write. Geocoding is best-effort and never blocks.
 */
export async function completeOnboarding(state: OnboardingState): Promise<CompleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!user.email) return { error: "We couldn't read your email. Please sign in again." };

  const firstName = state.firstName?.trim();
  const lastName = state.lastName?.trim();
  const displayName = [firstName, lastName].filter(Boolean).join(" ");
  const preferredContact = state.preferredContact ?? "email";

  if (!state.mode) return { error: "Please choose how you'll use WaveTap." };
  if (!firstName || !lastName) return { error: "Please enter your first and last name." };
  if (!state.suburb?.trim() && !state.postcode?.trim()) {
    return { error: "Please enter your suburb or postcode." };
  }
  if ((preferredContact === "mobile" || preferredContact === "both") && !state.mobile?.trim()) {
    return { error: "Add a mobile number, or set your preferred contact to email." };
  }
  if (!state.acceptedTerms) return { error: "Please accept the Terms to continue." };

  const roles = rolesFromMode(state.mode);
  const geo = await geocodeAU({
    suburb: state.suburb,
    postcode: state.postcode,
    state: state.state,
  });

  // One atomic, idempotent RPC commits both rows in a single transaction
  // (SECURITY INVOKER → own-row RLS still applies). A partial failure can no
  // longer orphan a profiles row, and a retry after a partial success succeeds
  // (ON CONFLICT DO UPDATE) instead of dead-ending on a duplicate key.
  const { error } = await supabase.rpc("complete_onboarding", {
    p_email: user.email,
    p_display_name: displayName,
    p_roles: roles,
    p_active_role: activeRoleFromMode(state.mode),
    p_location_suburb: state.suburb?.trim() || undefined,
    p_location_postcode: state.postcode?.trim() || undefined,
    p_location_state: state.state?.trim() || undefined,
    p_location_lat: geo?.lat ?? undefined,
    p_location_lng: geo?.lng ?? undefined,
    p_preferred_contact: preferredContact,
    p_mobile: state.mobile?.trim() || undefined,
    p_accepted_terms_at: new Date().toISOString(),
    p_tos_version: TOS_VERSION,
    p_is_interpreter: roles.includes("interpreter"),
    p_working_radius_km: state.workingRadiusKm ?? 30,
    p_availability: state.availability ?? {},
    p_bio: state.bio?.trim() || undefined,
    p_is_deaf_interpreter: state.isDeafInterpreter ?? false,
    p_accepts_remote: state.acceptsRemote ?? true,
  });
  if (error) {
    console.error("[complete_onboarding]", user.id, error.message);
    return { error: "We couldn't finish setting up your account. Please try again." };
  }

  redirect("/onboarding/done");
}
