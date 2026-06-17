import Link from "next/link";

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-semibold">Open bookings</h1>
        <p className="text-muted text-sm">Bookings looking for an interpreter.</p>
      </div>

      {!bookings || bookings.length === 0 ? (
        <p className="text-muted text-sm">No open bookings right now. Check back soon.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((b) => {
            const where =
              b.mode === "in_person"
                ? [b.location_suburb, b.location_state].filter(Boolean).join(", ") || "In person"
                : "Remote";
            return (
              <li key={b.id}>
                <Link
                  href={`/pool/${b.id}`}
                  className="block rounded-2xl border border-[var(--border)] p-4 transition-colors hover:bg-[var(--surface-secondary)]"
                >
                  <div className="text-foreground font-medium">{b.title}</div>
                  <div className="text-muted mt-1 text-sm">
                    {b.booking_date} · {b.start_time?.slice(0, 5)} · {where}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
