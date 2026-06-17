import Link from "next/link";
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

  // Signer-visible interest + confirmation state (RLS: select_signer / select_party).
  const [{ data: interests }, { data: confirmations }] = await Promise.all([
    supabase.from("booking_interests").select("interpreter_id").eq("booking_id", id),
    supabase
      .from("booking_confirmations")
      .select("interpreter_id, interpreter_contact_shared, confirmed_at")
      .eq("booking_id", id),
  ]);
  const interestCount = interests?.length ?? 0;

  const confirmedIds = (confirmations ?? []).map((c) => c.interpreter_id);
  const { data: confirmedProfiles } = await supabase
    .from("public_profiles")
    .select("id, display_name")
    .in("id", confirmedIds);
  const nameById = new Map((confirmedProfiles ?? []).map((p) => [p.id, p.display_name]));

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

      {confirmations && confirmations.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-foreground text-sm font-semibold">Confirmed</h2>
          {confirmations.map((c) => (
            <div
              key={c.interpreter_id}
              className="rounded-2xl border border-[var(--border)] p-4"
            >
              <div className="text-foreground font-medium">
                {nameById.get(c.interpreter_id) ?? "Interpreter"}
              </div>
              <div className="text-muted mt-1 text-sm">Contact: {c.interpreter_contact_shared}</div>
            </div>
          ))}
        </section>
      ) : booking.status === "open" ? (
        <section className="flex flex-col gap-3">
          <p className="text-muted text-sm">
            {interestCount === 0
              ? "No interpreters have expressed interest yet."
              : `${interestCount} interpreter${interestCount === 1 ? "" : "s"} interested.`}
          </p>
          {interestCount > 0 ? (
            <Link
              href={`/bookings/${booking.id}/select`}
              className="bg-accent text-accent-foreground inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium"
            >
              Review &amp; confirm
            </Link>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
