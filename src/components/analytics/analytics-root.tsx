"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureSource, track } from "@/lib/analytics";

const APP_SCREENS: [RegExp, "collection" | "decouvrir" | "serie" | "ajouter" | "univers"][] = [
  [/^\/bibliotheque\/[^/]+/, "serie"],
  [/^\/bibliotheque/, "collection"],
  [/^\/decouvrir/, "decouvrir"],
  [/^\/(ajouter|onboarding)/, "ajouter"],
  [/^\/univers/, "univers"],
];
const APP_PREFIXES = /^\/(bibliotheque|decouvrir|ajouter|onboarding|univers|envies|parent|profil|collection)/;
const OPENED_KEY = "ys_opened";
const IDLE_MS = 30 * 60_000; // a PWA resumed after 30 minutes is a new visit

// Mounted once in the root layout : remembers where the visit came from,
// and counts one "app_opened" per visit inside the app (the basis of the
// retention numbers) : the first screen, or a return after 30 minutes away.
export function AnalyticsRoot() {
  const pathname = usePathname();
  useEffect(() => {
    captureSource();
  }, []);
  useEffect(() => {
    function opened() {
      if (!APP_PREFIXES.test(location.pathname)) return;
      try {
        const last = Number(sessionStorage.getItem(OPENED_KEY) ?? 0);
        sessionStorage.setItem(OPENED_KEY, String(Date.now()));
        if (Date.now() - last < IDLE_MS) return;
      } catch {
        return;
      }
      track("app_opened", { screen: APP_SCREENS.find(([re]) => re.test(location.pathname))?.[1] ?? "autre" });
    }
    opened();
    const onVisible = () => document.visibilityState === "visible" && opened();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [pathname]);
  return null;
}
