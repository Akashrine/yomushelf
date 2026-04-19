"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { WrappedData } from "@/app/wrapped/[year]/actions";
import { trackEvent } from "@/lib/analytics";
import { WrappedProgressBar } from "./wrapped-progress-bar";
import { WrappedCardOpener } from "./wrapped-card-opener";
import { WrappedCardStat } from "./wrapped-card-stat";
import { WrappedCardTopSeries } from "./wrapped-card-top-series";
import { WrappedCardGenre } from "./wrapped-card-genre";
import { WrappedCardShare } from "./wrapped-card-share";

type Props = {
  year: number;
  username: string | null;
  avatarInitials: string;
  publicSlug: string | null;
  result: { success: true; data: WrappedData } | { success: false; error: string };
};

const BG = "#0e0b0b";

export function WrappedCarousel({ year, username, avatarInitials, publicSlug, result }: Props) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // Empty state
  if (!result.success || result.data.total_volumes_added < 10) {
    return <EmptyState year={year} />;
  }

  const data = result.data;
  const avgPerVolume = data.total_volumes_added > 0
    ? (data.total_budget_spent / data.total_volumes_added).toFixed(2)
    : null;

  const cards = [
    <WrappedCardOpener key="opener" year={year} username={username} avatarInitials={avatarInitials} />,
    <WrappedCardStat
      key="volumes"
      value={String(data.total_volumes_added)}
      label="tomes ajoutés"
      sub={data.delta_vs_previous_year_pct !== null
        ? `${data.delta_vs_previous_year_pct >= 0 ? "+" : ""}${data.delta_vs_previous_year_pct.toFixed(0)}% vs ${year - 1}`
        : `en ${year}`}
      accent
    />,
    <WrappedCardStat
      key="budget"
      value={data.total_budget_spent.toFixed(0)}
      unit="€"
      label="dépensés en mangas"
      sub={avgPerVolume ? `soit ${avgPerVolume} € / tome en moyenne` : undefined}
    />,
    ...(data.top_3_series.length > 0
      ? [<WrappedCardTopSeries key="top" series={data.top_3_series} />]
      : []),
    <WrappedCardGenre key="genre" genre={data.top_genre} delta={data.delta_vs_previous_year_pct} year={year} />,
    <WrappedCardShare key="share" year={year} slug={publicSlug} username={username} />,
  ];

  const total = cards.length;

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);

  // Track card views
  useEffect(() => {
    trackEvent("wrapped_card_viewed", { year, card_index: index });
  }, [index, year]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // Touch swipe
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) delta > 0 ? next() : prev();
    touchStartX.current = null;
  }

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: BG, color: "white", userSelect: "none" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <Link
          href="/bibliotheque"
          className="text-xs transition-opacity hover:opacity-70"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          ← Biblio
        </Link>
        <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>
          漫 Yomushelf
        </span>
        <Link
          href={`/wrapped/${year}`}
          className="text-xs transition-opacity hover:opacity-70 invisible"
          aria-hidden
        >
          ·
        </Link>
      </div>

      <WrappedProgressBar total={total} current={index} />

      {/* Cards viewport */}
      <div className="flex-1 relative overflow-hidden mt-2">
        <div
          className="flex h-full"
          style={{
            transform: `translateX(-${index * 100}%)`,
            transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            willChange: "transform",
          }}
        >
          {cards.map((card, i) => (
            <div
              key={i}
              className="shrink-0 w-full h-full relative"
              onClick={() => {
                // Tap right half → next, left half → prev
                // (handled by touch for swipe; this covers desktop clicks)
              }}
            >
              {card}
            </div>
          ))}
        </div>

        {/* Click zones (desktop) */}
        <button
          type="button"
          aria-label="Précédent"
          onClick={prev}
          className="absolute left-0 inset-y-0 w-1/3 z-10"
          style={{ background: "transparent" }}
          disabled={index === 0}
        />
        <button
          type="button"
          aria-label="Suivant"
          onClick={next}
          className="absolute right-0 inset-y-0 w-1/3 z-10"
          style={{ background: "transparent" }}
          disabled={index === total - 1}
        />
      </div>

      {/* Arrow hints desktop */}
      <div className="hidden sm:flex items-center justify-between px-6 pb-4 shrink-0">
        <button
          type="button"
          onClick={prev}
          disabled={index === 0}
          className="text-sm disabled:opacity-20 transition-opacity"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          ← Précédent
        </button>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={next}
          disabled={index === total - 1}
          className="text-sm disabled:opacity-20 transition-opacity"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}

function EmptyState({ year }: { year: number }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-5 px-8 text-center"
      style={{ background: BG, color: "white" }}
    >
      <span style={{ fontSize: 56 }}>📦</span>
      <h1 className="text-xl font-bold">Pas encore assez de données</h1>
      <p className="text-sm max-w-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
        Il faut au moins 10 tomes ajoutés en {year} pour générer ton Wrapped.
      </p>
      <Link
        href="/ajouter"
        className="px-6 py-3 rounded-xl text-sm font-semibold"
        style={{ background: "#c0392b", color: "white" }}
      >
        Ajouter des mangas →
      </Link>
      <Link
        href="/bibliotheque"
        className="text-sm"
        style={{ color: "rgba(255,255,255,0.3)" }}
      >
        ← Retour à la bibliothèque
      </Link>
    </div>
  );
}
