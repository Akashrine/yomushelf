import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/server/cron-auth";
import { CONSENT_DAYS } from "@/lib/account/gate";
import { serviceClient } from "@/lib/server/consent";

// Vercel Cron — nightly at 05:15 UTC (vercel.json). An account under 15
// without a parent's consent after CONSENT_DAYS is deleted with all its
// data, as the sign-up screen and the parent email say.
const PER_RUN = 100;

async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const service = serviceClient();
  const before = new Date(Date.now() - CONSENT_DAYS * 86_400_000).toISOString();
  const { data, error } = await service
    .from("profiles")
    .select("id")
    .eq("age_band", "under_15")
    .is("parent_consent_at", null)
    .lt("age_band_set_at", before)
    .limit(PER_RUN);
  if (error) return NextResponse.json({ error: "Lecture impossible." }, { status: 502 });

  let deleted = 0;
  for (const { id } of data ?? []) {
    const { error: deleteError } = await service.auth.admin.deleteUser(id);
    if (!deleteError) deleted++;
  }
  return NextResponse.json({ deleted, candidates: data?.length ?? 0, before });
}

export const GET = handle;
export const POST = handle;
