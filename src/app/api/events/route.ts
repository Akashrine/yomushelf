import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { BatchSchema, isoWeek, validateEvents } from "@/lib/analytics-catalogue";

// First-party measurement. Only this route (and logServerEvent) may write
// analytics_events, with the service role : unknown events and properties
// are dropped (analytics-catalogue.ts). Nothing ties a row to a person :
// no user id, no IP ; a signed-in reader adds only the week their account
// was created ("cohort"), for retention by cohort.
const MAX_BYTES = 4096;
const PER_MINUTE = 60; // events per client per minute, per server instance

// Best-effort cap without Redis : a per-instance counter keyed by the IP,
// kept in memory one minute and never stored.
const counters = new Map<string, { minute: number; count: number }>();
function allowed(key: string, n: number): boolean {
  const minute = Math.floor(Date.now() / 60_000);
  const c = counters.get(key);
  if (!c || c.minute !== minute) {
    if (counters.size > 5000) counters.clear();
    counters.set(key, { minute, count: n });
    return n <= PER_MINUTE;
  }
  c.count += n;
  return c.count <= PER_MINUTE;
}

const done = () => new NextResponse(null, { status: 204 }); // never an error for the page

export async function POST(request: NextRequest) {
  // our own pages only (a browser always sends Sec-Fetch-Site)
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return done();
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return done();

  const raw = await request.text().catch(() => "");
  if (!raw || raw.length > MAX_BYTES) return done();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return done();
  }
  const batch = BatchSchema.safeParse(json);
  if (!batch.success) return done();
  const events = validateEvents(batch.data.events);
  if (!events.length) return done();

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowed(ip, events.length)) return done();

  // Cohort of a signed-in reader : the week of their account, nothing else.
  let cohort: string | undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.created_at) cohort = isoWeek(new Date(user.created_at));

  const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  await service.from("analytics_events").insert(
    events.map((e) => ({
      user_id: null,
      event_name: e.name,
      properties: { ...e.properties, ...batch.data.context, ...(e.path ? { path: e.path } : {}), ...(cohort ? { cohort } : {}) },
    }))
  );
  return done();
}
