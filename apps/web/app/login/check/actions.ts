"use server";

import { redirect } from "next/navigation";

import { checkRateLimit } from "@/lib/auth/rate-limit";
import { isSuspended } from "@/lib/auth/suspension";
import { createClient } from "@/lib/supabase/server";

export async function verifyCode(email: string, token: string) {
  if (!(await checkRateLimit("otp_verify", email, 10, 900))) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    return { error: "That code is invalid or has expired. Try again, or tap the link in your email." };
  }

  // Enforce suspension at the gate: a suspended account must not get a live
  // session even with a valid code. Sign out and bounce with a friendly message.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && (await isSuspended(user.id))) {
    await supabase.auth.signOut();
    return { error: "This account has been suspended. Contact support." };
  }

  redirect("/home");
}

export async function resendOtp(email: string) {
  if (!(await checkRateLimit("otp_send", email, 5, 900))) {
    return { error: "Couldn't resend just yet — please wait a moment." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
    },
  });
  return error ? { error: "Couldn't resend just yet — please wait a moment." } : { ok: true };
}
