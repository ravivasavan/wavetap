import { LayoutList } from "lucide-react";

import { BookingCard } from "@/components/booking-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export default async function PoolPage() {
  await requireUser();

  const supabase = await createClient();
  // Reads the public_bookings view (coarse, open-only, exact location / notes
  // withheld). The base table no longer exposes open rows broadly — see
  // docs/design/booking-surface.md OQ1.
  const { data: bookings } = await supabase
    .from("public_bookings")
    .select("id, title, location_suburb, location_state, booking_date, start_time, mode")
    .order("booking_date", { ascending: true });

  return (
    <>
      <PageHeader title="Open bookings" subtitle="Bookings looking for an interpreter." />

      {!bookings || bookings.length === 0 ? (
        <EmptyState
          icon={<LayoutList size={28} strokeWidth={1.5} />}
          title="No open bookings right now"
          body="When a signer posts a booking that needs an interpreter, it'll show up here."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((b) => {
            const where =
              b.mode === "in_person"
                ? [b.location_suburb, b.location_state].filter(Boolean).join(", ") || "In person"
                : "Remote";
            return (
              <li key={b.id}>
                <BookingCard
                  href={`/pool/${b.id}`}
                  title={b.title ?? "Booking"}
                  meta={`${b.booking_date} · ${b.start_time?.slice(0, 5)} · ${where}`}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
