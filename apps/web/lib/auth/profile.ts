import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** Returns the authenticated user, or redirects to /login if there's no session. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

/** Whether this user has completed onboarding (has a profiles row). */
export async function userHasProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data);
}
