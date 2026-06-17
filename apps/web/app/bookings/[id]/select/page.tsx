import { notFound, redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

import { SelectInterpreters } from "./select-interpreters";

export default async function SelectInterpretersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, signer_id, title, status, slots")
    .eq("id", id)
    .maybeSingle();
  if (!booking || booking.signer_id !== user.id) notFound();
  // Selection only applies while the booking is still open.
  if (booking.status !== "open") redirect(`/bookings/${id}`);

  const { data: interests } = await supabase
    .from("booking_interests")
    .select("interpreter_id")
    .eq("booking_id", id);
  const ids = (interests ?? []).map((i) => i.interpreter_id);

  // Directory info via the safe-column public views (no contact/exact location).
  const [{ data: profiles }, { data: meta }] = await Promise.all([
    supabase
      .from("public_profiles")
      .select("id, display_name, location_suburb, location_state")
      .in("id", ids),
    supabase
      .from("public_interpreter_profiles")
      .select("id, bio, is_deaf_interpreter, accepts_remote")
      .in("id", ids),
  ]);

  const interpreters = ids.map((iid) => {
    const p = (profiles ?? []).find((x) => x.id === iid);
    const m = (meta ?? []).find((x) => x.id === iid);
    return {
      id: iid,
      name: p?.display_name ?? "Interpreter",
      area: [p?.location_suburb, p?.location_state].filter(Boolean).join(", "),
      bio: m?.bio ?? null,
      isDeafInterpreter: Boolean(m?.is_deaf_interpreter),
      acceptsRemote: Boolean(m?.accepts_remote),
    };
  });

  const slotCount = Array.isArray(booking.slots) ? booking.slots.length : 1;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-1">
        <span className="text-muted text-xs uppercase tracking-wide">Select interpreters</span>
        <h1 className="text-foreground text-2xl font-semibold">{booking.title}</h1>
        <p className="text-muted text-sm">
          Choose {slotCount} interpreter{slotCount === 1 ? "" : "s"}. Contact details are shared
          with each other only once you confirm.
        </p>
      </div>

      {interpreters.length === 0 ? (
        <p className="text-muted text-sm">No interpreters have expressed interest yet.</p>
      ) : (
        <SelectInterpreters bookingId={id} slotCount={slotCount} interpreters={interpreters} />
      )}
    </main>
  );
}
