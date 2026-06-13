import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@wavetap/api";

import { isSuspended } from "@/lib/auth/suspension";

/** Paths reachable without a session. Everything else requires auth. */
function isPublic(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth")
  );
}

/**
 * Refreshes the Supabase session cookie on every request and gates protected
 * routes. Do NOT put logic between `createServerClient` and `getUser()`.
 *
 * (On the Next 16 upgrade this file's caller becomes `proxy.ts` / `proxy`.)
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Eject an already-signed-in user who has since been suspended, on their next
  // navigation to a protected route. Only runs when a session exists and the
  // route isn't public — the same request set that already did getUser().
  if (user && !isPublic(request.nextUrl.pathname)) {
    if (await isSuspended(user.id)) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "suspended");
      return NextResponse.redirect(url);
    }
  }

  return response;
}
