import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES = new Set(["signup", "recovery", "email_change", "email", "invite", "magiclink"]);

// Links of the account emails (sign-up confirmation, forgotten password).
// With the French templates (supabase/templates) the link carries a
// token_hash checked here on the server : it works from any device, even
// one that did not ask for it. Links of the default templates carry a
// PKCE code instead, which only works in the browser that asked for it.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  // Same-site paths only : "//host", "/\\host" or "https://…" would leave the app.
  const rawNext = searchParams.get("next") ?? "/bibliotheque";
  const next = /^\/(?![\/\\])/.test(rawNext) ? rawNext : "/bibliotheque";
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");

  const supabase = await createClient();
  if (tokenHash && type && OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return NextResponse.redirect(`${origin}/login?error=link_invalid`);
  }
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
