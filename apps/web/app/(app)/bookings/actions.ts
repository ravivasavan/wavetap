"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isCompositionSatisfied, type Slot } from "@wavetap/core";

import { requireUser } from "@/lib/auth/profile";
import { geocodeAU } from "@/lib/geocode";
import { createNotification } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** A user's shareable contact line: email, plus mobile when they prefer it. */
function shareableContact(p: {
  email: string;
  mobile: string | null;
  preferred_contact: string;
}): string {
  const out = [p.email];
  if ((p.preferred_contact === "mobile" || p.preferred_contact === "both") && p.mobile) {
    out.push(p.mobile);
  }
  return out.join(" · ");
}

export type CreateBookingInput = {
  title: string;
  bookingDate: string;
  startTime: string;
  endTime?: string;
  mode: "in_person" | "remote";
  suburb?: string;
  postcode?: string;
  state?: string;
  description?: string;
};

export type CreateBookingResult = { error: string } | void;

/**
 * Spike create path: insert one open booking (single `any` slot). Interest /
 * selection / confirmation are later plans. RLS `bookings_insert_own` enforces
 * signer_id = auth.uid(), so the row can only be created for the caller.
 */
export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const user = await requireUser();

  const title = input.title?.trim();
  if (!title) return { error: "Please give your booking a title." };
  if (!input.bookingDate) return { error: "Please choose a date." };
  if (!input.startTime) return { error: "Please choose a start time." };
  if (input.mode !== "in_person" && input.mode !== "remote") {
    return { error: "Please choose in-person or remote." };
  }
  const isInPerson = input.mode === "in_person";
  if (isInPerson && !input.suburb?.trim() && !input.postcode?.trim()) {
    return { error: "For an in-person booking, enter a suburb or postcode." };
  }

  // Best-effort geocode for in-person bookings (never blocks; see lib/geocode).
  const geo = isInPerson
    ? await geocodeAU({ suburb: input.suburb, postcode: input.postcode, state: input.state })
    : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      signer_id: user.id,
      title,
      description: input.description?.trim() || null,
      booking_date: input.bookingDate,
      start_time: input.startTime,
      end_time: input.endTime?.trim() || null,
      mode: input.mode,
      location_suburb: isInPerson ? input.suburb?.trim() || null : null,
      location_postcode: isInPerson ? input.postcode?.trim() || null : null,
      location_state: isInPerson ? input.state?.trim() || null : null,
      location_lat: geo?.lat ?? null,
      location_lng: geo?.lng ?? null,
      slots: [{ kind: "any" }],
      status: "open",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createBooking]", user.id, error?.message);
    return { error: "We couldn't create your booking. Please try again." };
  }

  redirect(`/bookings/${data.id}`);
}

export type InterestResult = { error: string } | { ok: true };

/**
 * Interpreter expresses interest in an open booking. RLS (booking_interests_
 * insert_own) enforces interpreter_id = auth.uid() AND the booking is open.
 * Best-effort notifies the signer (via the admin client, since the interpreter
 * can't read the booking's signer_id or write the signer's notification).
 */
export async function expressInterest(bookingId: string): Promise<InterestResult> {
  const user = await requireUser();

  const supabase = await createClient();
  const { error } = await supabase
    .from("booking_interests")
    .insert({ booking_id: bookingId, interpreter_id: user.id });

  if (error) {
    // 23505 = unique violation (already interested) — treat as success/idempotent.
    if (error.code === "23505") {
      revalidatePath(`/pool/${bookingId}`);
      return { ok: true };
    }
    console.error("[expressInterest]", user.id, bookingId, error.message);
    return { error: "We couldn't register your interest. The booking may have closed." };
  }

  // Notify the signer (admin client: interpreter can't read signer_id or write
  // the signer's notification row). Never blocks the interest itself.
  try {
    const admin = createAdminClient();
    const { data: booking } = await admin
      .from("bookings")
      .select("signer_id, title")
      .eq("id", bookingId)
      .maybeSingle();
    if (booking?.signer_id) {
      await createNotification({
        userId: booking.signer_id,
        type: "booking_interest",
        title: "New interest in your booking",
        body: `An interpreter is available for "${booking.title}".`,
        metadata: { booking_id: bookingId },
      });
    }
  } catch (e) {
    console.error("[expressInterest:notify]", bookingId, e);
  }

  revalidatePath(`/pool/${bookingId}`);
  return { ok: true };
}

export type ConfirmResult = { error: string } | void;

/**
 * Signer confirms one or more interested interpreters for their booking.
 * Verifies ownership + that the picks expressed interest, enforces team
 * composition (isCompositionSatisfied), snapshots both parties' contacts into
 * booking_confirmations (interpreter contact via the admin client — the signer
 * can't read it under RLS), flips the booking to confirmed, and notifies each
 * confirmed interpreter. RLS booking_confirmations_insert_signer also guards
 * the insert to the booking's signer.
 */
export async function confirmInterpreters(
  bookingId: string,
  interpreterIds: string[],
): Promise<ConfirmResult> {
  const user = await requireUser();
  if (interpreterIds.length === 0) return { error: "Select at least one interpreter." };

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, signer_id, title, status, slots")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.signer_id !== user.id) return { error: "Booking not found." };
  if (booking.status !== "open") {
    return { error: "This booking is no longer open for selection." };
  }

  // Only let the signer confirm interpreters who actually expressed interest.
  const { data: interests } = await supabase
    .from("booking_interests")
    .select("interpreter_id")
    .eq("booking_id", bookingId);
  const interestedIds = new Set((interests ?? []).map((i) => i.interpreter_id));
  if (!interpreterIds.every((id) => interestedIds.has(id))) {
    return { error: "One of the selected interpreters is no longer available." };
  }

  const { data: signerProfile } = await supabase
    .from("profiles")
    .select("email, mobile, preferred_contact")
    .eq("id", user.id)
    .maybeSingle();
  if (!signerProfile) return { error: "We couldn't read your contact details." };

  // Interpreters' contact + deaf flag need the admin client (own-row RLS hides
  // others' profiles from the signer).
  const admin = createAdminClient();
  const [{ data: interpreters }, { data: interpreterMeta }] = await Promise.all([
    admin.from("profiles").select("id, email, mobile, preferred_contact").in("id", interpreterIds),
    admin.from("interpreter_profiles").select("id, is_deaf_interpreter").in("id", interpreterIds),
  ]);
  const deafById = new Map((interpreterMeta ?? []).map((m) => [m.id, m.is_deaf_interpreter]));

  const slots = (booking.slots as Slot[] | null) ?? [];
  const confirmed = interpreterIds.map((id) => ({ isDeafInterpreter: deafById.get(id) ?? false }));
  if (!isCompositionSatisfied(slots, confirmed)) {
    return {
      error: `This booking needs exactly ${slots.length} interpreter${slots.length === 1 ? "" : "s"} matching its requested composition.`,
    };
  }

  const signerContact = shareableContact(signerProfile);
  const rows = interpreterIds.map((id) => {
    const ip = (interpreters ?? []).find((x) => x.id === id);
    return {
      booking_id: bookingId,
      interpreter_id: id,
      signer_contact_shared: signerContact,
      interpreter_contact_shared: ip ? shareableContact(ip) : "",
    };
  });
  const { error: confErr } = await supabase.from("booking_confirmations").insert(rows);
  if (confErr) {
    console.error("[confirmInterpreters]", user.id, bookingId, confErr.message);
    return { error: "We couldn't confirm the selection. Please try again." };
  }

  await supabase.from("bookings").update({ status: "confirmed" }).eq("id", bookingId);

  for (const id of interpreterIds) {
    try {
      await createNotification({
        userId: id,
        type: "booking_confirmed",
        title: "You've been confirmed for a booking",
        body: `You're confirmed for "${booking.title}". Signer contact: ${signerContact}.`,
        metadata: { booking_id: bookingId },
      });
    } catch (e) {
      console.error("[confirmInterpreters:notify]", id, e);
    }
  }

  redirect(`/bookings/${bookingId}`);
}

/** Interpreter withdraws interest (RLS booking_interests_delete_own). */
export async function withdrawInterest(bookingId: string): Promise<InterestResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("booking_interests")
    .delete()
    .eq("booking_id", bookingId)
    .eq("interpreter_id", user.id);
  if (error) {
    console.error("[withdrawInterest]", user.id, bookingId, error.message);
    return { error: "We couldn't withdraw your interest. Please try again." };
  }
  revalidatePath(`/pool/${bookingId}`);
  return { ok: true };
}
