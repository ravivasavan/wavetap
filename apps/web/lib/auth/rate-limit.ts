import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limiter backed by the auth_rate_limits table (service-role
 * only). Returns true if the action is allowed, false if the limit is exceeded.
 * Fails open on storage errors — don't lock users out if the limiter breaks.
 * SERVER-ONLY.
 */
export async function checkRateLimit(
  scope: string,
  key: string,
  max: number,
  windowSec: number,
): Promise<boolean> {
  const admin = createAdminClient();
  const now = Date.now();
  try {
    const { data } = await admin
      .from("auth_rate_limits")
      .select("window_start, count")
      .eq("scope", scope)
      .eq("key", key)
      .maybeSingle();

    const windowStart = data ? new Date(data.window_start).getTime() : 0;
    const expired = now - windowStart > windowSec * 1000;
    const nextCount = data && !expired ? data.count + 1 : 1;
    const nextWindowStart = data && !expired ? new Date(windowStart) : new Date(now);

    await admin.from("auth_rate_limits").upsert({
      scope,
      key,
      window_start: nextWindowStart.toISOString(),
      count: nextCount,
    });
    return nextCount <= max;
  } catch {
    return true; // fail open
  }
}
