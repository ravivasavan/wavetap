"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function verifyCode(email: string, token: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    return { error: "That code is invalid or has expired. Try again, or tap the link in your email." };
  }
  redirect("/home");
}

export async function resendOtp(email: string) {
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
