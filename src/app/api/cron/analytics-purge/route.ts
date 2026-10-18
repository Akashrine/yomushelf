import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAuthorizedCron } from "@/lib/server/cron-auth";
import type { Database } from "@/lib/types/database";

// Vercel Cron — nightly at 05:00 UTC (vercel.json). Measurement rows live
// 13 months, as stated on the privacy page.
const RETENTION_MONTHS = 13;

async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const before = new Date();
  before.setUTCMonth(before.getUTCMonth() - RETENTION_MONTHS);
  const { error, count } = await supabase.from("analytics_events").delete({ count: "exact" }).lt("created_at", before.toISOString());
  if (error) return NextResponse.json({ error: "Purge impossible." }, { status: 502 });
  return NextResponse.json({ deleted: count ?? 0, before: before.toISOString() });
}

export const GET = handle;
export const POST = handle;
