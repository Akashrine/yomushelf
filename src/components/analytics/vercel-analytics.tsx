"use client";

import { Analytics } from "@vercel/analytics/next";
import { redactLinkTokens } from "@/lib/analytics-catalogue";
import { measurementRefused } from "@/lib/analytics";

// Vercel Web Analytics records page URLs : link tokens (consent, family
// list) are credentials, replaced before anything leaves the browser.
// The reader's refusal (toggle, Do Not Track, Global Privacy Control)
// applies here too : a null event is not sent.
export function VercelAnalytics() {
  return <Analytics beforeSend={(event) => (measurementRefused() ? null : { ...event, url: redactLinkTokens(event.url) })} />;
}
