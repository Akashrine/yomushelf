"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

export function PublicCTAFooter() {
  return (
    <footer
      className="mt-16 px-4 sm:px-6 py-10 text-center"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <p className="text-lg font-bold mb-1">Tu collectionnes des mangas ?</p>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        Suis ta collection, ta progression et ton budget — gratuitement.
      </p>
      <Link
        href="/signup"
        onClick={() => trackEvent("public_profile_signup_cta_clicked")}
        className="inline-block px-6 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
        style={{ background: "var(--accent)", color: "white" }}
      >
        Crée ta bibliothèque →
      </Link>
      <p className="text-xs mt-4" style={{ color: "var(--muted)" }}>
        Yomushelf · Gratuit · Sans pub
      </p>
    </footer>
  );
}
