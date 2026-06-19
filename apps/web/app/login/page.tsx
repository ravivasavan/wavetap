import { CircleAlert } from "lucide-react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { LoginForm } from "./login-form";

const ERROR_MESSAGES: Record<string, string> = {
  suspended: "This account has been suspended. Contact support if you think this is a mistake.",
  link: "That sign-in link was invalid or has expired. Enter your email for a fresh one.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/home");

  const { error } = await searchParams;
  const message = error ? ERROR_MESSAGES[error] : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div className="flex flex-col gap-2 text-center">
        <p className="text-muted text-sm font-medium uppercase tracking-widest">Wavetap</p>
        <h1 className="text-foreground text-2xl font-semibold">Sign in</h1>
        <p className="text-muted text-sm">
          Enter your email — we&apos;ll send a one-time code and a sign-in link. No password.
        </p>
      </div>

      {message ? (
        <p
          className="text-danger flex items-center gap-2 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm"
          role="alert"
        >
          <CircleAlert size={16} strokeWidth={1.5} className="shrink-0" />
          {message}
        </p>
      ) : null}

      <LoginForm />
    </main>
  );
}
