"use client";

import Link from "next/link";
import { useState } from "react";
import { SwipeDeck } from "@/components/decouvrir/swipe-deck";
import type { DeckCard } from "@/lib/discovery/deck";

// The app's own Découvrir deck, playable without an account : nothing is
// saved ; at the end, the wishes picked here invite to sign up.
export function LandingDeck({ deck }: { deck: DeckCard[] }) {
  const [round, setRound] = useState(0);
  if (deck.length === 0) return null;
  return (
    <SwipeDeck
      key={round}
      deck={deck}
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
