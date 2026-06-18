import Link from "next/link";

import { BookingCard } from "@/components/booking-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

const CTA =
  "bg-accent text-accent-foreground inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium";
const CTA_SECONDARY =
  "text-foreground inline-flex items-center justify-center rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-secondary)]";

function bookingMeta(b: {
  booking_date: string | null;
  start_time: string | null;
  mode: string | null;
  location_suburb: string | null;
  location_state: string | null;
}): string {
  const where =
    b.mode === "in_person"
      ? [b.location_suburb, b.location_state].filter(Boolean).join(", ") || "In person"
      : "Remote";
  return `${b.booking_date} · ${b.start_time?.slice(0, 5)} · ${where}`;
}

export default async function HomePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, active_role")
    .eq("id", user.id)
    .maybeSingle();
  const activeRole = profile?.active_role ?? "signer";
  const firstName = (profile?.display_name ?? "").split(" ")[0] || "there";

  if (activeRole === "interpreter") {
    const { data: confs } = await supabase
      .from("booking_confirmations")
      .select("booking_id")
      .eq("interpreter_id", user.id);
    const ids = (confs ?? []).map((c) => c.booking_id);
    const { data: confirmed } = await supabase
      .from("bookings")
      .select("id, title, booking_date, start_time, mode, location_suburb, location_state")
      .in("id", ids)
      .order("booking_date", { ascending: true });
    const { data: ip } = await supabase
      .from("interpreter_profiles")
      .select("working_radius_km, availability_pattern")
      .eq("id", user.id)
      .maybeSingle();
    const pattern = (ip?.availability_pattern ?? {}) as Record<string, { available?: boolean }>;
    const isLive =
      (ip?.working_radius_km ?? 0) > 0 && Object.values(pattern).some((d) => d?.available);

    return (
      <>
        <PageHeader title={`Hi, ${firstName}`} subtitle="Your interpreter dashboard." />

        {!isLive ? (
          <div className="bg-surface mb-6 rounded-2xl border border-[var(--accent)] p-4 shadow-[var(--surface-shadow)]">
            <p className="text-foreground text-sm font-medium">You&apos;re not live in the pool yet</p>
            <p className="text-muted mt-1 text-sm">
              Set your working area and availability so signers can find you.
            </p>
            <Link href="/availability" className={`${CTA} mt-3`}>
              Set availability
            </Link>
          </div>
        ) : (
          <div className="mb-6 flex flex-wrap gap-3">
            <Link href="/pool" className={CTA}>
              Browse the pool
            </Link>
            <Link href="/availability" className={CTA_SECONDARY}>
              Edit availability
            </Link>
          </div>
        )}

        <h2 className="text-foreground mb-3 text-sm font-semibold">Confirmed bookings</h2>
        {!confirmed || confirmed.length === 0 ? (
          <EmptyState
            title="No confirmed bookings yet"
            body="When a signer confirms you for a booking, it'll appear here with their contact details."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {confirmed.map((b) => (
              <li key={b.id}>
                <BookingCard href="/my-bookings" title={b.title} meta={bookingMeta(b)} />
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  // Signer dashboard
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, title, booking_date, start_time, mode, location_suburb, location_state, status")
    .eq("signer_id", user.id)
    .order("booking_date", { ascending: false })
    .limit(5);

  return (
    <>
      <PageHeader title={`Hi, ${firstName}`} subtitle="Your bookings at a glance." />

      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/bookings/new" className={CTA}>
          Post a booking
        </Link>
        <Link href="/bookings" className={CTA_SECONDARY}>
          My bookings
        </Link>
      </div>

      <h2 className="text-foreground mb-3 text-sm font-semibold">Recent bookings</h2>
      {!bookings || bookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          body="Post your first booking and interpreters in your area can express interest."
          action={
            <Link href="/bookings/new" className={CTA}>
              Post a booking
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((b) => (
            <li key={b.id}>
              <BookingCard
                href={`/bookings/${b.id}`}
                title={b.title}
                meta={bookingMeta(b)}
                status={b.status}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
