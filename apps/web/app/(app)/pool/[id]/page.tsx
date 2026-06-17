import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

import { InterestButton } from "./interest-button";

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] py-2">
      <span className="text-muted text-sm">{label}</span>
      <span className="text-foreground text-sm">{value ?? "—"}</span>
    </div>
  );
}

export default async function PoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const supabase = await createClient();
  // Coarse fields only, via the public_bookings view (open-only; exact location
  // and notes are withheld at the view — see docs/design/booking-surface.md OQ1).
  const { data: booking } = await supabase
    .from("public_bookings")
    .select("id, title, booking_date, start_time, end_time, mode, location_suburb, location_state")
    .eq("id", id)
    .maybeSingle();

  if (!booking) notFound();

  // Is the viewer an interpreter, and have they already expressed interest?
  const [{ data: profile }, { data: interest }] = await Promise.all([
    supabase.from("profiles").select("roles").eq("id", user.id).maybeSingle(),
    supabase
      .from("booking_interests")
      .select("id")
      .eq("booking_id", id)
      .eq("interpreter_id", user.id)
      .maybeSingle(),
  ]);
  const isInterpreter = (profile?.roles ?? []).includes("interpreter");

  const where =
    booking.mode === "in_person"
      ? [booking.location_suburb, booking.location_state].filter(Boolean).join(", ") || "In person"
      : "Remote";
  const time = [booking.start_time, booking.end_time].filter(Boolean).join(" – ");

  return (
    <>
      <PageHeader title={booking.title ?? "Booking"} />
      <div className="flex max-w-md flex-col gap-6">
        <div className="flex flex-col">
          <Row label="Date" value={booking.booking_date} />
          <Row label="Time" value={time} />
          <Row label="Mode" value={booking.mode === "in_person" ? "In person" : "Remote"} />
          <Row label="Area" value={where} />
        </div>

        {isInterpreter ? (
          <InterestButton bookingId={booking.id!} initialInterested={Boolean(interest)} />
        ) : (
          <p className="text-muted text-xs leading-relaxed">
            Only interpreters can express interest in a booking.
          </p>
        )}
      </div>
    </>
  );
}
