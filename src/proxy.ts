import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { BYPASS_COOKIE, BYPASS_PARAM, MAINTENANCE_HTML, maintenanceDecision } from "@/lib/maintenance";

export async function proxy(request: NextRequest) {
  // Maintenance first : nothing below (session refresh, pages, server
  // actions, API routes) runs while it is on.
  const decision = maintenanceDecision({
    enabled: process.env.MAINTENANCE_MODE,
    token: process.env.MAINTENANCE_BYPASS_TOKEN,
    cookie: request.cookies.get(BYPASS_COOKIE)?.value,
    param: request.nextUrl.searchParams.get(BYPASS_PARAM),
  });
  if (decision === "grant_bypass") {
    const url = request.nextUrl.clone();
    url.searchParams.delete(BYPASS_PARAM);
    const res = NextResponse.redirect(url);
    res.cookies.set(BYPASS_COOKIE, process.env.MAINTENANCE_BYPASS_TOKEN!, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 4,
    });
    return res;
  }
  if (decision === "block") {
    const html = request.method === "GET" && (request.headers.get("accept") ?? "").includes("text/html");
    return new NextResponse(html ? MAINTENANCE_HTML : "Maintenance en cours. Réessaie dans quelques minutes.", {
      status: 503,
      headers: {
        "content-type": html ? "text/html; charset=utf-8" : "text/plain; charset=utf-8",
        "retry-after": "600",
        "cache-control": "no-store",
      },
    });
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Static files only : Next assets, /icons/ and single-segment root files
    // (public/*.svg). A dynamic path ending in ".png" (/bibliotheque/x.png)
    // must still go through maintenance and the session refresh.
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|[^/]+\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
