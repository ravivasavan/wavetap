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

  const displayName = state.displayName?.trim();
  const preferredContact = state.preferredContact ?? "email";

  if (!state.mode) return { error: "Please choose how you'll use WaveTap." };
  if (!displayName) return { error: "Please enter your name." };
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

  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    email: user.email!,
    display_name: displayName,
    roles,
    active_role: activeRoleFromMode(state.mode),
    location_suburb: state.suburb?.trim() || null,
    location_postcode: state.postcode?.trim() || null,
    location_state: state.state?.trim() || null,
    location_lat: geo?.lat ?? null,
    location_lng: geo?.lng ?? null,
    preferred_contact: preferredContact,
    mobile: state.mobile?.trim() || null,
    accepted_terms_at: new Date().toISOString(),
    tos_version: TOS_VERSION,
    // sign_languages defaults to {auslan}; notification_* default true/false
  });
  if (profileError) {
    return { error: "We couldn't save your profile. Please try again." };
  }

  if (roles.includes("interpreter")) {
    const { error: interpreterError } = await supabase.from("interpreter_profiles").insert({
      id: user.id,
      working_radius_km: state.workingRadiusKm ?? 30,
      availability_pattern: state.availability ?? {},
      bio: state.bio?.trim() || null,
      is_deaf_interpreter: state.isDeafInterpreter ?? false,
      accepts_remote: state.acceptsRemote ?? true,
    });
    if (interpreterError) {
      // Profile saved; interpreter details can be completed later from the profile.
      return {
        error:
          "Your profile was saved, but we couldn't save your interpreter details. You can finish those from your profile.",
      };
    }
  }

  redirect("/home");
}
