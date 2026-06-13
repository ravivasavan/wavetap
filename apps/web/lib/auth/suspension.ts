import { createAdminClient } from "@/lib/supabase/admin";

/**
 * True if the user's profile is suspended. Uses the admin (service-role) client
 * so it works in the pre-redirect login path and isn't subject to own-row RLS
 * timing. Fails open (returns false) on a storage error — a broken lookup must
 * not lock a legitimate user out. SERVER-ONLY.
 */
export async function isSuspended(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("suspended_at")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data?.suspended_at);
}
