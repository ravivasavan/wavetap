import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link landing. The email's link points here with ?token_hash=…&type=email
 * (set in the Supabase email template). verifyOtp writes the session cookies on
 * the redirect response. On success we send users to /home, whose profile gate
 * forwards them to /onboarding if they haven't onboarded — so the link and the
 * 6-digit-code paths converge on identical routing.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
