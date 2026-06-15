import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] py-2">
      <span className="text-muted text-sm">{label}</span>
      <span className="text-foreground text-sm">{value}</span>
    </div>
  );
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();

  const supabase = await createClient();
  // RLS lets the signer read their own booking (bookings_select_own_signer).
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, title, description, booking_date, start_time, end_time, mode, location_suburb, location_state, status",
    )
    .eq("id", id)
    .maybeSingle();

  if (!booking) notFound();

  const location =
    booking.mode === "in_person"
      ? [booking.location_suburb, booking.location_state].filter(Boolean).join(", ") || "In person"
      : "Remote";
  const time = [booking.start_time, booking.end_time].filter(Boolean).join(" – ");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-1">
        <span className="text-muted text-xs uppercase tracking-wide">{booking.status}</span>
        <h1 className="text-foreground text-2xl font-semibold">{booking.title}</h1>
      </div>

      <div className="flex flex-col">
        <Row label="Date" value={booking.booking_date} />
        <Row label="Time" value={time} />
        <Row label="Mode" value={booking.mode === "in_person" ? "In person" : "Remote"} />
        <Row label="Location" value={location} />
      </div>

      {booking.description ? (
        <p className="text-foreground text-sm leading-relaxed">{booking.description}</p>
      ) : null}

      <p className="text-muted text-xs leading-relaxed">
        This booking is live in the pool. Interpreter interest and selection are coming next.
      </p>
    </main>
  );
}
