import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/home");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div className="flex flex-col gap-2 text-center">
        <p className="text-muted text-sm font-medium uppercase tracking-widest">WaveTap</p>
        <h1 className="text-foreground text-2xl font-semibold">Sign in</h1>
        <p className="text-muted text-sm">
          Enter your email — we&apos;ll send a one-time code and a sign-in link. No password.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
