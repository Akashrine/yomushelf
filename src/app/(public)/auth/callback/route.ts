import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logServerEvent } from "@/lib/server/analytics";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  // Same-site paths only : "//host", "/\\host" or "https://…" would leave the app.
  const rawNext = searchParams.get("next") ?? "/bibliotheque";
  const next = /^\/(?![\/\\])/.test(rawNext) ? rawNext : "/bibliotheque";
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = await createClient();
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  // A Google account seen for the first time : created within the last minute.
  const user = data.user;
  if (user && Date.now() - new Date(user.created_at).getTime() < 60_000) {
    const src = searchParams.get("src");
    await logServerEvent("account_created", { method: "google" }, { userId: user.id, src: src && /^[a-z0-9_.-]{1,40}$/.test(src) ? src : null });
  }

  return NextResponse.redirect(`${origin}${next}`);
}
