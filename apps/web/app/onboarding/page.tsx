import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { requireUser, userHasProfile } from "@/lib/auth/profile";

// Placeholder onboarding — authed users without a profile land here. The real
// soft-starting-mode onboarding flow is the next phase.
export default async function OnboardingPage() {
  const user = await requireUser();
  if (await userHasProfile(user.id)) redirect("/home");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-muted text-sm font-medium uppercase tracking-widest">WaveTap</p>
      <h1 className="text-foreground text-2xl font-semibold">Welcome</h1>
      <p className="text-muted text-sm">
        You&apos;re signed in as <span className="text-foreground">{user.email}</span>. Setting up
        your profile is coming next.
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
