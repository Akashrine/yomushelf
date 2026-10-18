import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BatchSchema, validateEvents } from "@/lib/analytics-catalogue";

// First-party measurement (no cookie of its own, no IP stored). Signed-in
// readers get their user id through their session, so RLS lets them write
// only their own rows ; visitors write anonymous rows. Unknown events and
// properties are dropped (analytics-catalogue.ts).
const MAX_BYTES = 4096;

export async function POST(request: NextRequest) {
  const raw = await request.text().catch(() => "");
  if (!raw || raw.length > MAX_BYTES) return new NextResponse(null, { status: 204 });

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const batch = BatchSchema.safeParse(json);
  if (!batch.success) return new NextResponse(null, { status: 204 });
  const events = validateEvents(batch.data.events);
  if (!events.length) return new NextResponse(null, { status: 204 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("analytics_events").insert(
    events.map((e) => ({ user_id: user?.id ?? null, event_name: e.name, properties: { ...e.properties, ...batch.data.context } }))
  );
  // Always 204 : measurement never surfaces an error to the page.
  return new NextResponse(null, { status: 204 });
}
