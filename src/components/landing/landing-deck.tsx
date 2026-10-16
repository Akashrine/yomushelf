"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SwipeDeck } from "@/components/decouvrir/swipe-deck";
import type { DeckCard } from "@/lib/discovery/deck";

// The app's own Découvrir deck, playable without an account : nothing is
// saved ; at the end, the wishes picked here invite to sign up.
// Covers go through the Next image optimizer (WebP, 640 px) : the original
// JPEG of the first card weighed 190 KB on the landing's first load.
const optimized = (url: string | null) => (url ? `/_next/image?url=${encodeURIComponent(url)}&w=640&q=70` : null);

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
        <div className="flex w-full max-w-[340px] flex-col items-center gap-4 rounded-3xl p-8 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 18px 40px rgba(29,36,51,0.12)" }}>
          <p className="font-serif text-2xl font-semibold">
            {wished.length > 0 ? `${wished.length} envie${wished.length > 1 ? "s" : ""} !` : "Rien ne t'a tenté ?"}
          </p>
          {wished.length > 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>{wished.map((w) => w.entry.title).join(", ")}</p>}
          <p className="text-sm">Crée un compte pour garder tes envies et ranger ta collection.</p>
          <Link href="/signup" className="flex min-h-12 w-full items-center justify-center rounded-2xl px-6 text-base font-bold text-white" style={{ background: "var(--accent)" }}>
            Créer un compte
          </Link>
          <button type="button" onClick={() => setRound((r) => r + 1)} className="min-h-11 text-sm font-semibold underline" style={{ color: "var(--muted)" }}>
            Recommencer
          </button>
        </div>
      )}
    />
  );
}
