import type { ReactNode } from "react";

/** Empty state: icon + title + helper copy + optional CTA (per 11_ROUTES_AND_PAGES). */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] px-6 py-12 text-center">
      {icon ? <div className="text-muted">{icon}</div> : null}
      <div className="flex flex-col gap-1">
        <p className="text-foreground font-medium">{title}</p>
        {body ? <p className="text-muted mx-auto max-w-sm text-sm">{body}</p> : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
