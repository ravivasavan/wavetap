"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// One generic message for every failure path — never reveal whether an email is
// banned, unregistered, or rate-limited (no account enumeration).
const GENERIC_ERROR = "We couldn't send a sign-in email. Please try again.";

export type LoginState = { error: string } | null;

export async function sendOtp(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) return { error: "Please enter your email address." };

  // Banned-email gate. banned_emails RLS is admin-only and the user is
  // unauthenticated here, so this must run with the service-role key.
  const admin = createAdminClient();
  const { data: banned } = await admin
    .from("banned_emails")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (banned) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
    },
  });
  if (error) return { error: GENERIC_ERROR };

  redirect(`/login/check?email=${encodeURIComponent(email)}`);
}
