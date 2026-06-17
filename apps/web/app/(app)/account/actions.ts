"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/profile";
import { geocodeAU } from "@/lib/geocode";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AvailabilityPattern, PreferredContact } from "@/app/onboarding/types";

export type ActionResult = { error: string } | { ok: true };

type Role = "signer" | "interpreter";

/** Switch which role's experience is active (dual-role users). */
export async function switchActiveRole(role: Role): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ active_role: role })
    .eq("id", user.id);
  if (error) {
    console.error("[switchActiveRole]", user.id, error.message);
    return { error: "Couldn't switch role. Please try again." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Add the second role to the account (additive opt-in). Appends to `roles`,
 * makes it active, and (for interpreters) ensures an interpreter_profiles row
 * exists so the availability editor has something to write to.
 */
export async function addRole(role: Role): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", user.id)
    .maybeSingle();
  const roles = new Set<string>(profile?.roles ?? []);
  roles.add(role);
  const { error } = await supabase
    .from("profiles")
    .update({ roles: [...roles], active_role: role })
    .eq("id", user.id);
  if (error) {
    console.error("[addRole]", user.id, error.message);
    return { error: "Couldn't add that role. Please try again." };
  }
  if (role === "interpreter") {
    // Seed a not-live interpreter profile if absent (idempotent on conflict).
    await supabase
      .from("interpreter_profiles")
      .upsert({ id: user.id, working_radius_km: 30, availability_pattern: {} }, { onConflict: "id" });
  }
  revalidatePath("/", "layout");
  redirect(role === "interpreter" ? "/availability" : "/profile");
}

export type UpdateProfileInput = {
  firstName: string;
  lastName: string;
  suburb?: string;
  postcode?: string;
  state?: string;
  preferredContact: PreferredContact;
  mobile?: string;
};

/** Edit core profile fields (columns the plan-001 grant allows the user to update). */
export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult> {
  const user = await requireUser();
  const firstName = input.firstName?.trim();
  const lastName = input.lastName?.trim();
  if (!firstName || !lastName) return { error: "Please enter your first and last name." };
  if (!input.suburb?.trim() && !input.postcode?.trim()) {
    return { error: "Please enter your suburb or postcode." };
  }
  if ((input.preferredContact === "mobile" || input.preferredContact === "both") && !input.mobile?.trim()) {
    return { error: "Add a mobile number, or set your preferred contact to email." };
  }

  const geo = await geocodeAU({ suburb: input.suburb, postcode: input.postcode, state: input.state });
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: [firstName, lastName].join(" "),
      location_suburb: input.suburb?.trim() || null,
      location_postcode: input.postcode?.trim() || null,
      location_state: input.state?.trim() || null,
      location_lat: geo?.lat ?? null,
      location_lng: geo?.lng ?? null,
      preferred_contact: input.preferredContact,
      mobile: input.mobile?.trim() || null,
    })
    .eq("id", user.id);
  if (error) {
    console.error("[updateProfile]", user.id, error.message);
    return { error: "Couldn't save your profile. Please try again." };
  }
  revalidatePath("/profile");
  redirect("/profile");
}

/** Toggle notification channels (notification_* columns). */
export async function updateNotificationPrefs(prefs: {
  email: boolean;
  push: boolean;
  sms: boolean;
}): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      notification_email: prefs.email,
      notification_push: prefs.push,
      notification_sms: prefs.sms,
    })
    .eq("id", user.id);
  if (error) {
    console.error("[updateNotificationPrefs]", user.id, error.message);
    return { error: "Couldn't save your preferences. Please try again." };
  }
  revalidatePath("/settings/notifications");
  return { ok: true };
}

/** Interpreter availability editor → interpreter_profiles. */
export async function updateAvailability(input: {
  workingRadiusKm: number;
  availability: AvailabilityPattern;
  bio?: string;
  isDeafInterpreter?: boolean;
  acceptsRemote?: boolean;
}): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("interpreter_profiles")
    .upsert(
      {
        id: user.id,
        working_radius_km: input.workingRadiusKm,
        availability_pattern: input.availability as never,
        bio: input.bio?.trim() || null,
        is_deaf_interpreter: input.isDeafInterpreter ?? false,
        accepts_remote: input.acceptsRemote ?? true,
      },
      { onConflict: "id" },
    );
  if (error) {
    console.error("[updateAvailability]", user.id, error.message);
    return { error: "Couldn't save your availability. Please try again." };
  }
  revalidatePath("/availability");
  return { ok: true };
}

/** Hard-delete the account (cascades via FKs). Uses the admin client. */
export async function deleteAccount(): Promise<ActionResult> {
  const user = await requireUser();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[deleteAccount]", user.id, error.message);
    return { error: "Couldn't delete your account. Please contact support." };
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
