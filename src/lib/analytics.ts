import { cleanPath, sourceFrom, type EventName, type EventProps } from "./analytics-catalogue";

// Client side of Yomushelf's first-party measurement (see
// analytics-catalogue.ts). Events go to /api/events in small batches,
// with the visit's source and the route ; nothing identifies the visitor.

const SOURCE_KEY = "ys_src";
export const OPT_OUT_KEY = "ys_optout";
const queue: { name: string; props: Record<string, unknown>; path: string }[] = [];

// "Ne pas être mesuré" (privacy page), Do Not Track or Global Privacy
// Control : nothing is sent at all.
export function measurementRefused(): boolean {
  try {
    if (localStorage.getItem(OPT_OUT_KEY) === "1") return true;
  } catch {
    // storage blocked : fall through to the browser signals
  }
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
}
let timer: ReturnType<typeof setTimeout> | null = null;

// Last events must leave before the tab goes away.
if (typeof window !== "undefined") {
  addEventListener("pagehide", () => flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

// First touch of this browsing session (sessionStorage : gone when the tab
// closes). Called once at app start ; later pages reuse it.
export function captureSource(): string | undefined {
  if (measurementRefused()) return undefined;
  try {
    const known = sessionStorage.getItem(SOURCE_KEY);
    if (known) return known;
    const src = sourceFrom(location.search, document.referrer, location.hostname);
    sessionStorage.setItem(SOURCE_KEY, src);
    return src;
  } catch {
    return sourceFrom(location.search, document.referrer, location.hostname);
  }
}

export function currentSource(): string | undefined {
  try {
    return sessionStorage.getItem(SOURCE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function flush() {
  timer = null;
  if (!queue.length) return;
  const body = JSON.stringify({
    events: queue.splice(0, 10),
    context: {
      src: currentSource(),
      device: matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
    },
  });
  // sendBeacon survives a page change (a tap on "Créer un compte")
  const sent = typeof navigator.sendBeacon === "function" && navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
  if (!sent) fetch("/api/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
  if (queue.length) timer = setTimeout(flush, 0);
}

// Properties are checked against the catalogue here (types) and again by
// /api/events (values).
export function track<N extends EventName>(name: N, props?: EventProps<N>) {
  if (typeof window === "undefined" || measurementRefused()) return;
  // the route when it happened, not when the batch leaves
  queue.push({ name, props: (props ?? {}) as Record<string, unknown>, path: cleanPath(location.pathname) });
  if (!timer) timer = setTimeout(flush, 400);
}

// Older call sites (Wrapped).
export function trackEvent(name: EventName, params?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined" || measurementRefused()) return;
  queue.push({ name, props: params ?? {}, path: cleanPath(location.pathname) });
  if (!timer) timer = setTimeout(flush, 400);
}
