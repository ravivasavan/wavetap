import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export default async function InterpreterBookingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Confirmations for this interpreter (RLS booking_confirmations_select_party)
  // carry the shared signer contact snapshot.
  const { data: confs } = await supabase
    .from("booking_confirmations")
    .select("booking_id, signer_contact_shared, confirmed_at")
    .eq("interpreter_id", user.id);
  const ids = (confs ?? []).map((c) => c.booking_id);

  // The booking rows (RLS bookings_select_involved lets a confirmed interpreter read).
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, title, booking_date, start_time, end_time, mode, location_suburb, location_state")
    .in("id", ids)
    .order("booking_date", { ascending: true });
  const bookingById = new Map((bookings ?? []).map((b) => [b.id, b]));

  return (
    <>
      <PageHeader title="My bookings" subtitle="Bookings you've been confirmed for." />

      {!confs || confs.length === 0 ? (
        <EmptyState
          title="No confirmed bookings yet"
          body="Express interest in open bookings from the pool — when a signer confirms you, they'll show up here with contact details."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {confs.map((c) => {
            const b = bookingById.get(c.booking_id);
            if (!b) return null;
            const where =
              b.mode === "in_person"
                ? [b.location_suburb, b.location_state].filter(Boolean).join(", ") || "In person"
                : "Remote";
            const time = [b.start_time, b.end_time].filter(Boolean).join(" – ");
            return (
              <li
                key={c.booking_id}
                className="rounded-2xl border border-[var(--border)] p-4"
              >
                <div className="text-foreground font-medium">{b.title}</div>
                <div className="text-muted mt-1 text-sm">
                  {b.booking_date} · {time} · {where}
                </div>
                <div className="text-foreground mt-2 text-sm">
                  Signer contact: <span className="text-muted">{c.signer_contact_shared}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
