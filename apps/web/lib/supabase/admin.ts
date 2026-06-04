import { createClient } from "@supabase/supabase-js";
import type { Database } from "@wavetap/api";

/**
 * Service-role Supabase client (secret key). SERVER-ONLY — never import into a
 * Client Component or it leaks the secret into the browser bundle. Bypasses RLS,
 * so use only for privileged checks like the banned-email gate. Uses the plain
 * supabase-js client (not @supabase/ssr, which blocks the secret key) with
 * sessions disabled.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
