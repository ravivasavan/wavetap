import Link from "next/link";

/** Compact booking row used on home, my-bookings, and pool lists. */
export function BookingCard({
  href,
  title,
  meta,
  status,
}: {
  href: string;
  title: string;
  meta: string;
  status?: string | null;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-[var(--border)] p-4 transition-colors hover:bg-[var(--surface-secondary)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-foreground font-medium">{title}</div>
        {status ? (
          <span className="text-muted shrink-0 text-xs uppercase tracking-wide">{status}</span>
        ) : null}
      </div>
      <div className="text-muted mt-1 text-sm">{meta}</div>
    </Link>
  );
}
