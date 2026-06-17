import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { requireUser, userHasProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const user = await requireUser();
  if (!(await userHasProfile(user.id))) redirect("/onboarding");

  const supabase = await createClient();
  const { count: unread } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("read", false);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-foreground text-2xl font-semibold">You&apos;re in.</h1>
        <p className="text-muted text-sm">
          Signed in as <span className="text-foreground">{user.email}</span>
        </p>
      </div>

      <nav className="flex flex-col gap-3">
        <Link
          href="/bookings/new"
          className="bg-accent text-accent-foreground rounded-2xl px-5 py-3.5 text-center text-sm font-medium"
        >
          Post a booking
        </Link>
        <Link
          href="/pool"
          className="text-foreground rounded-2xl border border-[var(--border)] px-5 py-3.5 text-center text-sm font-medium transition-colors hover:bg-[var(--surface-secondary)]"
        >
          Browse the pool
        </Link>
        <Link
          href="/notifications"
          className="text-foreground flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] px-5 py-3.5 text-center text-sm font-medium transition-colors hover:bg-[var(--surface-secondary)]"
        >
          Notifications
          {unread && unread > 0 ? (
            <span className="bg-accent text-accent-foreground inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold">
              {unread}
            </span>
          ) : null}
        </Link>
      </nav>

      <form action={signOut} className="text-center">
        <button type="submit" className="text-muted hover:text-foreground text-sm underline">
          Sign out
        </button>
      </form>
    </main>
  );
}
