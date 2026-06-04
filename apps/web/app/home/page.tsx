import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { requireUser, userHasProfile } from "@/lib/auth/profile";

// Placeholder authed home — proves the session works. Real home comes later.
export default async function HomePage() {
  const user = await requireUser();
  if (!(await userHasProfile(user.id))) redirect("/onboarding");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-foreground text-2xl font-semibold">You&apos;re in.</h1>
      <p className="text-muted text-sm">
        Signed in as <span className="text-foreground">{user.email}</span>
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="text-muted hover:text-foreground text-sm underline"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
