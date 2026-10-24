import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/server/cron-auth";
import { serviceClient } from "@/lib/server/consent";
import { EMAIL_LOG_KEEP_DAYS, LIST_KEEP_DAYS } from "@/lib/wishlist/share";

// Vercel Cron — nightly at 05:30 UTC (vercel.json). What the Christmas
// list leaves behind is erased, as the privacy page says :
// * a family link stopped or expired LIST_KEEP_DAYS ago, and with it its
//   reservations (cascade) ;
// * a parent link expired as long ago ;
// * the log of emails sent (it only serves the sending limits).
const DAY = 86_400_000;

async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const service = serviceClient();
  const listBefore = new Date(Date.now() - LIST_KEEP_DAYS * DAY).toISOString();
  const logBefore = new Date(Date.now() - EMAIL_LOG_KEEP_DAYS * DAY).toISOString();

  const shares = await service
    .from("wishlist_shares")
    .delete({ count: "exact" })
    .or(`expires_at.lt.${listBefore},revoked_at.lt.${listBefore}`);
  const parentLinks = await service.from("wishlist_parent_links").delete({ count: "exact" }).lt("expires_at", listBefore);
  const emailLog = await service.from("consent_email_sends").delete({ count: "exact" }).lt("sent_at", logBefore);

  if (shares.error || parentLinks.error || emailLog.error) {
    return NextResponse.json({ error: "Purge impossible." }, { status: 502 });
  }
  return NextResponse.json({
    shares: shares.count ?? 0,
    parentLinks: parentLinks.count ?? 0,
    emailLog: emailLog.count ?? 0,
    listBefore,
    logBefore,
  });
}

export const GET = handle;
export const POST = handle;
