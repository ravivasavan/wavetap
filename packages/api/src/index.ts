/**
 * WaveTap API — typed Supabase client factory shared by web + native.
 *
 * Platform-agnostic: each app supplies its own URL + publishable key (web reads
 * NEXT_PUBLIC_*, native reads EXPO_PUBLIC_*) and, on native, a storage adapter
 * (expo-secure-store) since there's no localStorage.
 *
 * `Database` is generated from the live schema. Regenerate after migrations:
 * `supabase gen types typescript --linked > src/database.types.ts` (or via the
 * Supabase MCP `generate_typescript_types`).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

export type { Database };

export interface SupabaseEnv {
  url: string;
  /** The new Supabase publishable key (sb_publishable_…). Safe in clients with RLS. */
  publishableKey: string;
}

export interface ClientOptions {
  /** Native: pass an expo-secure-store-backed adapter. Web: omit (uses cookies/localStorage). */
  storage?: {
    getItem: (key: string) => Promise<string | null> | string | null;
    setItem: (key: string, value: string) => Promise<void> | void;
    removeItem: (key: string) => Promise<void> | void;
  };
}

export function createWaveTapClient(
  env: SupabaseEnv,
  options: ClientOptions = {},
): SupabaseClient<Database> {
  return createClient<Database>(env.url, env.publishableKey, {
    auth: {
      ...(options.storage ? { storage: options.storage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export type { SupabaseClient };
