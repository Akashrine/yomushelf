"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";

type Position = "header" | "hero" | "deck_end" | "final";

// A sign-up link that counts which call to action was used.
export function TrackedLink({ position, ...props }: React.ComponentProps<typeof Link> & { position: Position }) {
  return <Link {...props} onClick={(e) => { track("landing_cta_clicked", { position }); props.onClick?.(e); }} />;
}
