import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@wavetap/api";

/**
 * Server Supabase client for Server Components, Route Handlers, and Server
 * Actions. The `setAll` try/catch is required: Server Components can't set
 * cookies, so the middleware (`updateSession`) is what persists refreshed
 * tokens. Route Handlers / Server Actions CAN set cookies, so verifyOtp /
 * signOut called from those write the session correctly.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware refreshes the session.
          }
        },
      },
    },
  );
}
