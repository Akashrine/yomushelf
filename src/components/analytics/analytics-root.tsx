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

// Mounted once in the root layout : remembers where the visit came from,
// and counts one "app_opened" per browsing session inside the app (the
// basis of the retention numbers).
export function AnalyticsRoot() {
  const pathname = usePathname();
  useEffect(() => {
    captureSource();
  }, []);
  useEffect(() => {
    if (!APP_PREFIXES.test(pathname)) return;
    try {
      if (sessionStorage.getItem(OPENED_KEY)) return;
      sessionStorage.setItem(OPENED_KEY, "1");
    } catch {
      return;
    }
    track("app_opened", { screen: APP_SCREENS.find(([re]) => re.test(pathname))?.[1] ?? "autre" });
  }, [pathname]);
  return null;
}
