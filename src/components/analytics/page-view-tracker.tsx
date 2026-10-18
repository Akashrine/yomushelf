"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import type { EventName } from "@/lib/analytics-catalogue";

export function PageViewTracker({ event, params }: { event: EventName; params?: Record<string, string | number | boolean> }) {
  useEffect(() => {
    trackEvent(event, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
