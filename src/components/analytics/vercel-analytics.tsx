"use client";

import { Analytics } from "@vercel/analytics/next";
import { redactLinkTokens } from "@/lib/analytics-catalogue";

// Vercel Web Analytics records page URLs : link tokens (consent, family
// list) are credentials, replaced before anything leaves the browser.
export function VercelAnalytics() {
  return <Analytics beforeSend={(event) => ({ ...event, url: redactLinkTokens(event.url) })} />;
}
