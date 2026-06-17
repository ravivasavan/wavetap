import { Bell, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/profile";

const ROW =
  "flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] px-4 py-3.5 transition-colors hover:bg-[var(--surface-secondary)]";

export default async function SettingsPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex max-w-md flex-col gap-3">
        <Link href="/settings/notifications" className={ROW}>
          <span className="text-foreground flex items-center gap-3 text-sm font-medium">
            <Bell size={18} strokeWidth={1.5} className="text-muted" />
            Notifications
          </span>
          <ChevronRight size={18} strokeWidth={1.5} className="text-muted" />
        </Link>
        <Link href="/settings/delete-account" className={ROW}>
          <span className="text-danger flex items-center gap-3 text-sm font-medium">
            <Trash2 size={18} strokeWidth={1.5} />
            Delete account
          </span>
          <ChevronRight size={18} strokeWidth={1.5} className="text-muted" />
        </Link>
      </div>
    </>
  );
}
