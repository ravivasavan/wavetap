"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/profile";
import { geocodeAU } from "@/lib/geocode";
import { createNotification } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
