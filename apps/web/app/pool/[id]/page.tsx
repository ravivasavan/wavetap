import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

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
  await requireUser();

  const supabase = await createClient();
  // Coarse fields only, via the public_bookings view (open-only; exact location
  // and notes are withheld at the view — see docs/design/booking-surface.md OQ1).
  const { data: booking } = await supabase
    .from("public_bookings")
    .select("id, title, booking_date, start_time, end_time, mode, location_suburb, location_state")
    .eq("id", id)
    .maybeSingle();

  if (!booking) notFound();

  const where =
    booking.mode === "in_person"
      ? [booking.location_suburb, booking.location_state].filter(Boolean).join(", ") || "In person"
      : "Remote";
  const time = [booking.start_time, booking.end_time].filter(Boolean).join(" – ");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-12">
      <h1 className="text-foreground text-2xl font-semibold">{booking.title}</h1>

      <div className="flex flex-col">
        <Row label="Date" value={booking.booking_date} />
        <Row label="Time" value={time} />
        <Row label="Mode" value={booking.mode === "in_person" ? "In person" : "Remote"} />
        <Row label="Area" value={where} />
      </div>

      <p className="text-muted text-xs leading-relaxed">
        Expressing interest is coming next — for now this is a read-only preview of the pool.
      </p>
    </main>
  );
}
