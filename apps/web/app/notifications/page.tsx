import Link from "next/link";

import { requireUser } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

import { markAllNotificationsRead } from "./actions";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function NotificationsPage() {
  await requireUser();
  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, read, created_at, metadata")
    .order("created_at", { ascending: false });

  const items = notifications ?? [];
  const hasUnread = items.some((n) => !n.read);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-foreground text-2xl font-semibold">Notifications</h1>
        {hasUnread ? (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="text-muted hover:text-foreground text-sm underline">
              Mark all read
            </button>
          </form>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="text-muted text-sm">Nothing yet. We&apos;ll let you know when there&apos;s news.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => {
            const bookingId =
              n.metadata && typeof n.metadata === "object" && "booking_id" in n.metadata
                ? String((n.metadata as { booking_id?: string }).booking_id ?? "")
                : "";
            const href =
              n.type === "booking_interest" && bookingId
                ? `/bookings/${bookingId}`
                : n.type === "booking_confirmed" && bookingId
                  ? `/pool/${bookingId}`
                  : null;
            const inner = (
              <div
                className={`rounded-2xl border p-4 ${
                  n.read
                    ? "border-[var(--border)]"
                    : "border-[var(--accent)] bg-[var(--surface-secondary)]"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-foreground font-medium">{n.title}</span>
                  <span className="text-muted shrink-0 text-xs">{timeAgo(n.created_at)}</span>
                </div>
                {n.body ? <p className="text-muted mt-1 text-sm">{n.body}</p> : null}
              </div>
            );
            return <li key={n.id}>{href ? <Link href={href}>{inner}</Link> : inner}</li>;
          })}
        </ul>
      )}

      <Link href="/home" className="text-muted hover:text-foreground text-sm underline">
        Back to home
      </Link>
    </main>
  );
}
