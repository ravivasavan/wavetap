"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/profile";
import { geocodeAU } from "@/lib/geocode";
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
