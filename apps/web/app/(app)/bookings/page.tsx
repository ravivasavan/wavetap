import Link from "next/link";

import { BookingCard } from "@/components/booking-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export default async function MyBookingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, title, booking_date, start_time, mode, location_suburb, location_state, status")
    .eq("signer_id", user.id)
    .order("booking_date", { ascending: false });

  return (
    <>
      <PageHeader
        title="My bookings"
        subtitle="Everything you've posted."
        action={
          <Link
            href="/bookings/new"
            className="bg-accent text-accent-foreground inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium"
          >
            Post a booking
          </Link>
        }
      />

      {!bookings || bookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          body="Post your first booking and interpreters in your area can express interest."
          action={
            <Link
              href="/bookings/new"
              className="bg-accent text-accent-foreground inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium"
            >
              Post a booking
            </Link>
          }
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
                  href={`/bookings/${b.id}`}
                  title={b.title}
                  meta={`${b.booking_date} · ${b.start_time?.slice(0, 5)} · ${where}`}
                  status={b.status}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
