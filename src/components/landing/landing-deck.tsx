"use client";

import { useMemo, useState } from "react";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { SwipeDeck } from "@/components/decouvrir/swipe-deck";
import type { DeckCard } from "@/lib/discovery/deck";

// The app's own Découvrir deck, playable without an account : nothing is
// saved ; at the end, the wishes picked here invite to sign up.
// Covers go through the Next image optimizer (WebP, 640 px, default quality 75) : the original
// JPEG of the first card weighed 190 KB on the landing's first load.
const optimized = (url: string | null) => (url ? `/_next/image?url=${encodeURIComponent(url)}&w=640&q=75` : null);

export function LandingDeck({ deck }: { deck: DeckCard[] }) {
  const [round, setRound] = useState(0);
  const cards = useMemo(() => deck.map((c) => ({ ...c, entry: { ...c.entry, cover_url: optimized(c.entry.cover_url) } })), [deck]);
  if (cards.length === 0) return null;
  return (
    <SwipeDeck
      key={round}
      deck={cards}
      demo
      renderEnd={(wished) => (
        <div className="manga-panel relative flex w-full max-w-[340px] flex-col items-center gap-4 overflow-hidden rounded-3xl p-8 text-center" style={{ color: "var(--ink)" }}>
          <span aria-hidden="true" className="manga-speedlines pointer-events-none absolute inset-0" />
          <p
            className="manga-sticker relative rounded-2xl px-4 py-1 font-display text-4xl leading-tight tracking-wide"
            style={{ background: wished.length > 0 ? "var(--pop)" : "var(--surface)", color: "var(--ink)", transform: "rotate(-2deg)" }}
          >
            {wished.length > 0 ? `${wished.length} envie${wished.length > 1 ? "s" : ""} !` : "Rien ne t'a tenté ?"}
          </p>
          {wished.length > 0 && <p className="relative text-sm font-medium" style={{ color: "var(--muted)" }}>{wished.map((w) => w.entry.title).join(", ")}</p>}
          <p className="relative text-base font-medium">Crée un compte pour garder tes envies et ranger ta collection.</p>
          <TrackedLink position="deck_end" href="/signup" className="manga-button relative flex min-h-14 w-full items-center justify-center rounded-2xl px-6 text-lg font-bold text-white" style={{ background: "var(--accent)" }}>
            Créer un compte
          </TrackedLink>
          <button type="button" onClick={() => setRound((r) => r + 1)} className="relative min-h-11 px-4 text-sm font-bold underline underline-offset-4" style={{ color: "var(--ink)" }}>
            Recommencer
          </button>
        </div>
      )}
    />
  );
}
