"use client";

import { useCallback, useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppIcon } from "@/components/app/app-icon";
import { Cover } from "@/components/collection/reader-home";
import { VolumeSheet, type VolumeSavedEvent } from "@/components/collection/volume-sheet";
import { ReadingToast } from "@/components/collection/reading-toast";
import { useReadingAction, type ReadingIntent } from "@/components/collection/use-reading-action";
import { VolumeGrid, type GridMode } from "@/components/bibliotheque/volume-grid";
import { PictureRow } from "@/components/bibliotheque/picture-row";
import { SeriesMenu, formOf, type Runner } from "@/components/bibliotheque/series-menu";
import { markReadUpTo, removeUserVolume, restoreSeries, setSeriesLiked } from "@/app/(app)/bibliotheque/actions";
import { saveReading } from "@/app/(app)/collection/actions";
import { addSeriesToLibrary } from "@/app/(app)/ajouter/actions";
import { addWishlistItem } from "@/app/(app)/envies/actions";
import { lastKnownPrice, nextVolumeToBuy, type OwnedVolume } from "@/lib/collection/value";
import type { Reading } from "@/lib/collection/reading";
import { gapBelow, rangeLabel } from "@/lib/collection/fill";
import { track } from "@/lib/analytics";
import { GENRE_LABELS, ageLabel } from "@/lib/discovery/suggest";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
import type { Demographic } from "@/lib/types/database";

type Manga = {
  id: string;
  title: string;
  author: string | null;
  publisher_fr: string | null;
  total_volumes: number | null;
  status: "ongoing" | "completed" | "paused";
  cover_url: string | null;
  genres: string[];
  demographic: Demographic | null;
  audience_min_age: number | null;
  audience_age_source: "cnlj" | "estimate" | null;
  audience_age_scope: "series" | "volume" | null;
  audience_age_volumes: number[] | null;
  audience_age_year: number | null;
  synopsis: string | null;
  is_private: boolean;
};

export type ShelfPresence = "on_shelf" | "archived" | "absent";

type Props = {
  manga: Manga;
  presence: ShelfPresence;
  volumes: OwnedVolume[];
  readings: Reading[];
  wishedVolumes: number[];
  liked: boolean | null;
  volumeCovers?: Record<number, string>; // volume number → cover, when known
  similar?: { id: string; title: string; cover_url: string | null; onShelf: boolean }[];
  pictures?: string[]; // "En images", filled nightly from MyAnimeList
};

type Toggle = { nums: number[]; on: boolean };
type FillPrompt = { kind: GridMode; from: number; to: number };
type Notice = { text: string; undo?: () => void };

const NETWORK_ERROR = "Impossible de confirmer l'enregistrement. Vérifie ta connexion puis réessaie.";

const applyToggle = (set: Set<number>, t: Toggle) => {
  const next = new Set(set);
  for (const n of t.nums) {
    if (t.on) next.add(n);
    else next.delete(n);
  }
  return next;
};

// A series, Letterboxd style : the cover, three big actions, then the
// volumes themselves. Tapping a volume is the whole interaction ; reading
// lives in its own tab, never mixed with what is at home.
export function SerieDetail({ manga, presence, volumes, readings, wishedVolumes, liked, volumeCovers = {}, similar = [], pictures = [] }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<GridMode>("tomes");
  const [menuOpen, setMenuOpen] = useState(false);
  const [openVolume, setOpenVolume] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<FillPrompt | null>(null);
  const [extra, setExtra] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const reading = useReadingAction();

  const ownedFromServer = useMemo(() => new Set(volumes.map((v) => v.volume_number)), [volumes]);
  const readFromServer = useMemo(() => new Set(readings.filter((r) => r.status === "read").map((r) => r.volume_number)), [readings]);
  // The tile changes at the tap ; the server render replaces it once saved.
  const [owned, toggleOwned] = useOptimistic(ownedFromServer, applyToggle);
  const [read, toggleRead] = useOptimistic(readFromServer, applyToggle);

  const onShelf = presence === "on_shelf";
  const totalVolumes = manga.total_volumes ?? 0;
  const highest = Math.max(0, ...owned, ...read, ...wishedVolumes);
  const gridCount = (totalVolumes > 0 ? Math.max(totalVolumes, highest) : Math.max(highest + 1, 12)) + extra;
  // A long series shows the useful part first : a few volumes past the
  // last one at home, the rest one tap away.
  const shownCount = showAll ? gridCount : Math.min(gridCount, Math.max(highest + 8, 24));
  const canExtend = manga.status !== "completed" || totalVolumes === 0;
  const toBuy = nextVolumeToBuy(volumes);
  const wishTarget = onShelf ? (totalVolumes === 0 || toBuy <= totalVolumes ? toBuy : null) : 1;

  const run: Runner = (action, after) => {
    setError(null);
    startTransition(async () => {
      const result = await action().catch(() => ({ success: false as const, error: NETWORK_ERROR }));
      if (!result.success) {
        setPrompt(null);
        setError(result.error ?? "Pas enregistré. Réessaie.");
        return;
      }
      after();
      router.refresh();
    });
  };

  // run(), plus the tile change shown at once
  function runToggle(target: "owned" | "read", t: Toggle, action: () => Promise<{ success: boolean; error?: string }>, after: () => void = () => {}) {
    setError(null);
    startTransition(async () => {
      (target === "owned" ? toggleOwned : toggleRead)(t);
      const result = await action().catch(() => ({ success: false as const, error: NETWORK_ERROR }));
      if (!result.success) {
        setPrompt(null);
        setError(result.error ?? "Pas enregistré. Réessaie.");
        return;
      }
      after();
      router.refresh();
    });
  }

  const addOwned = (nums: number[]) =>
    addSeriesToLibrary({ series: { source: "db", manga_id: manga.id }, owned: { mode: "list", volumes: nums }, reading: { mode: "none" } });

  function tapVolume(n: number) {
    if (mode === "details") {
      setOpenVolume(n);
      return;
    }
    setNotice(null);
    track("volume_toggled", { action: (mode === "tomes" ? owned : read).has(n) ? "remove" : "add", tab: mode });
    if (mode === "tomes") {
      if (owned.has(n)) {
        setPrompt(null);
        runToggle("owned", { nums: [n], on: false }, () => removeUserVolume(formOf({ manga_id: manga.id, volume_number: String(n) })), () =>
          setNotice({ text: `Tome ${n} enlevé`, undo: () => runToggle("owned", { nums: [n], on: true }, () => addOwned([n])) })
        );
        return;
      }
      const gap = gapBelow(owned, n);
      setPrompt(gap ? { kind: "tomes", ...gap } : null);
      runToggle("owned", { nums: [n], on: true }, () => addOwned([n]));
      return;
    }
    // lectures
    if (read.has(n)) {
      setPrompt(null);
      runToggle("read", { nums: [n], on: false }, () => saveReading({ manga_id: manga.id, volume_number: n, intent: "clear" }));
      return;
    }
    const gap = gapBelow(read, n);
    setPrompt(gap ? { kind: "lectures", ...gap } : null);
    runToggle("read", { nums: [n], on: true }, () => saveReading({ manga_id: manga.id, volume_number: n, intent: "finish_earlier" }));
  }

  function acceptPrompt(p: FillPrompt) {
    setPrompt(null);
    track("fill_prompt_answered", { answer: "yes", tab: p.kind === "lectures" ? "lectures" : "tomes", volumes: p.to - p.from + 1 });
    const nums = Array.from({ length: p.to - p.from + 1 }, (_, i) => p.from + i);
    if (p.kind === "tomes") {
      runToggle("owned", { nums, on: true }, () =>
        addSeriesToLibrary({ series: { source: "db", manga_id: manga.id }, owned: { mode: "range", from: p.from, to: p.to }, reading: { mode: "none" } })
      );
    } else {
      runToggle("read", { nums, on: true }, () => markReadUpTo(formOf({ manga_id: manga.id, up_to: String(p.to) })));
    }
  }

  function act(intent: ReadingIntent, volume: number) {
    reading.run(intent, { mangaId: manga.id, title: manga.title, volume }, () => setOpenVolume(null));
  }

  // once per series, with the presence seen on arrival (an add on this page
  // changes it, which is not a second visit)
  const arrival = useRef(presence);
  useEffect(() => {
    track("series_viewed", { presence: arrival.current });
  }, [manga.id]);

  const closeSheet = useCallback(() => setOpenVolume(null), []);
  function handleSaved(event: VolumeSavedEvent) {
    setOpenVolume(null);
    setNotice({ text: event.kind === "added" ? `Tome ${event.volume} ajouté` : event.kind === "removed" ? `Tome ${event.volume} enlevé` : `Tome ${event.volume} enregistré` });
    router.refresh();
  }

  const ownedVolume = openVolume != null ? volumes.find((v) => v.volume_number === openVolume) ?? null : null;
  const openReading = openVolume != null ? readings.find((r) => r.volume_number === openVolume) ?? null : null;
  const isLiked = liked === true;
  const wished = wishTarget != null && wishedVolumes.includes(wishTarget);

  const hint =
    mode === "lectures"
      ? "Touche les tomes que tu as lus."
      : owned.size === 0
        ? "Tu as des tomes ? Touche le dernier que tu as."
        : "Touche un tome pour l'ajouter ou l'enlever.";

  // Pictures and similar series : under the volumes for a series at home,
  // above them for one being discovered.
  const extras = (
    <>
      {pictures.length > 0 && <PictureRow title={manga.title} pictures={pictures} />}

      {similar.length > 0 && (
        <section aria-labelledby="h-similar" className="flex flex-col gap-3">
          <h2 id="h-similar" className="text-2xl sm:text-3xl">Dans le même genre</h2>
          <ul className="no-scrollbar -mx-4 flex snap-x scroll-pl-4 gap-4 overflow-x-auto px-4 pb-3 pt-1 sm:-mx-6 sm:scroll-pl-6 sm:px-6">
            {similar.map((c) => (
              <li key={c.id} className="w-28 shrink-0 snap-start sm:w-32">
                <Link href={`/bibliotheque/${c.id}`} onClick={() => track("similar_clicked")} className="flex flex-col gap-2">
                  <span className="manga-panel-sm manga-press relative block w-full overflow-hidden rounded-xl" style={{ aspectRatio: "2/3" }}>
                    <Cover shelf={{ manga_id: c.id, title: c.title, cover_url: c.cover_url }} volume={1} full bare />
                    {c.onShelf && (
                      <span className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "var(--accent)", color: "white", border: "2px solid var(--ink)" }}>
                        <AppIcon name="check" size={15} strokeWidth={3} />
                        <span className="sr-only">Chez toi</span>
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 text-sm font-bold leading-snug" style={{ color: "var(--ink)" }}>{c.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Hero : the cover, blown up and blurred behind it */}
      {/* Framed like a manga panel : ink border, hard shadow from sm up */}
      <section
        className="relative -mx-4 -mt-4 overflow-hidden px-4 pb-6 pt-2 text-white sm:mx-0 sm:mt-0 border-b-[3px] sm:rounded-3xl sm:border-[3px] sm:px-8 sm:pb-8 sm:shadow-[6px_6px_0_var(--ink)]"
        style={{ background: "var(--ink)", borderColor: "var(--ink)" }}
      >
        {manga.cover_url && (
          <span aria-hidden="true" className="absolute inset-0 scale-125 opacity-50 blur-2xl" style={{ background: `url(${manga.cover_url}) center/cover no-repeat` }} />
        )}
        <span aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(18,21,29,0.25) 0%, rgba(18,21,29,0.9) 100%)" }} />
        {/* Light halftone dots over the dark panel */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,250,242,0.09) 1.2px, transparent 1.6px)", backgroundSize: "11px 11px" }}
        />
        <div className="relative flex flex-col gap-4">
          <Link
            href={onShelf ? "/bibliotheque" : "/decouvrir"}
            className="mt-1 flex min-h-11 items-center gap-1.5 self-start rounded-xl px-3 text-sm font-bold text-white"
            style={{ border: "2px solid rgba(255,250,242,0.75)", background: "rgba(18,21,29,0.45)" }}
          >
            <AppIcon name="arrow-left" size={16} /> {onShelf ? "Ma collection" : "Retour"}
          </Link>
          <div className="flex items-end gap-4 sm:gap-6">
            <div className="manga-panel-sm w-32 shrink-0 overflow-hidden rounded-xl sm:w-44" style={{ aspectRatio: "2/3", boxShadow: "5px 5px 0 var(--pop)" }}>
              <Cover shelf={{ manga_id: manga.id, title: manga.title, cover_url: manga.cover_url }} volume={1} full bare />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-1">
              <h1 className="text-4xl leading-[0.95] text-white sm:text-5xl" style={{ textShadow: "3px 3px 0 var(--ink)", overflowWrap: "anywhere" }}>
                {manga.title}
              </h1>
              {manga.author && <p className="text-sm font-semibold text-white/90">{manga.author}</p>}
              <p className="text-xs text-white/80">
                {[
                  totalVolumes > 0 ? `${totalVolumes} tomes` : null,
                  manga.status === "completed" ? "terminée" : manga.status === "ongoing" ? "en cours" : null,
                  manga.is_private ? null : ageLabel({ ...manga, author: null, top_50_rank: null, demographic: manga.demographic }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          {manga.genres.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Genres">
              {manga.genres.slice(0, 4).map((g) => (
                <li key={g} className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: "var(--surface)", color: "var(--ink)", border: "2px solid var(--ink)" }}>
                  {cap(GENRE_LABELS[g] ?? g)}
                </li>
              ))}
            </ul>
          )}
          {manga.synopsis && <p className="max-w-[65ch] text-sm leading-relaxed text-white/90">{manga.synopsis}</p>}
          {onShelf && (
            <p
              className="manga-sticker flex items-baseline gap-1.5 self-start rounded-xl px-3 py-1 text-base font-bold"
              style={{ background: "var(--pop)", color: "var(--ink)", transform: "rotate(-1.5deg)" }}
            >
              <span className="font-display font-normal text-3xl leading-none">{owned.size}</span> tome{owned.size > 1 ? "s" : ""} chez toi
              {totalVolumes > 0 && <span className="font-semibold"> sur {totalVolumes}</span>}
            </p>
          )}
        </div>
      </section>

      {/* A series being discovered : two clear choices */}
      {presence === "absent" && (
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          {wished ? (
            <Link
              href="/envies"
              className="manga-panel-sm manga-press flex min-h-14 items-center justify-center gap-2 rounded-2xl text-base font-bold"
              style={{ background: "var(--pop)", color: "var(--ink)" }}
            >
              <AppIcon name="star" size={20} filled /> Dans mes envies
            </Link>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => addWishlistItem(formOf({ manga_id: manga.id, volume_number: "1" })), () => { track("wish_added", { from: "serie" }); setNotice({ text: `${manga.title} est dans tes envies` }); })}
              className="manga-button flex min-h-14 items-center justify-center gap-2 rounded-2xl text-lg font-bold disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              <AppIcon name="star" size={20} /> Je le veux
            </button>
          )}
          <button
            type="button"
            onClick={() => document.getElementById("grid-title")?.parentElement?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="manga-panel-sm manga-press flex min-h-14 items-center justify-center gap-2 rounded-2xl text-base font-bold"
            style={{ background: "var(--surface)", color: "var(--ink)" }}
          >
            <AppIcon name="plus" size={20} strokeWidth={2.5} /> Je l&apos;ai déjà
          </button>
        </div>
      )}

      {/* Three big actions */}
      {onShelf && (
        <div className="grid grid-cols-3 gap-3 sm:max-w-md">
          {onShelf && (
            <ActionButton
              icon="heart"
              label="J'aime"
              on={isLiked}
              disabled={isPending}
              onClick={() => run(() => setSeriesLiked(formOf({ manga_id: manga.id, liked: isLiked ? "none" : "true" })), () => {})}
            />
          )}
          {wishTarget != null &&
            (wished ? (
              <Link
                href="/envies"
                className="manga-panel-sm manga-press flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center text-[13px] font-bold leading-tight"
                style={{ background: "var(--pop)", color: "var(--ink)" }}
              >
                <AppIcon name="star" size={22} filled />
                Dans mes envies
              </Link>
            ) : (
              <ActionButton
                icon="star"
                label={`Je veux le ${wishTarget}`}
                on={false}
                disabled={isPending}
                onClick={() =>
                  run(() => addWishlistItem(formOf({ manga_id: manga.id, volume_number: String(wishTarget) })), () => {
                    track("wish_added", { from: "serie" });
                    setNotice({ text: `Tome ${wishTarget} dans tes envies` });
                  })
                }
              />
            ))}
          {onShelf && <ActionButton icon="more" label="Plus" on={false} onClick={() => setMenuOpen(true)} />}
        </div>
      )}

      {!onShelf && extras}

      {presence === "archived" ? (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl p-4 sm:p-5" style={{ background: "var(--surface)", border: "2px dashed #5b6170" }}>
          <p className="text-base">
            <strong>Tu as retiré cette série de ta collection.</strong> <span style={{ color: "var(--muted)" }}>Tes tomes sont gardés.</span>
          </p>
          <button
            type="button"
            onClick={() => run(() => restoreSeries(formOf({ manga_id: manga.id })), () => setNotice({ text: `${manga.title} est de retour dans ta collection.` }))}
            disabled={isPending}
            className="manga-button min-h-12 rounded-2xl px-5 text-base font-bold disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            La remettre
          </button>
        </section>
      ) : (
        <section aria-labelledby="grid-title" className="flex scroll-mt-20 flex-col gap-3">
          <h2 id="grid-title" className="sr-only">Les tomes</h2>
          {onShelf && mode !== "details" && (
            <div className="grid grid-cols-2 gap-2 sm:max-w-sm" role="group" aria-label="Ce que montre la grille">
              {(["tomes", "lectures"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => {
                    setMode(m);
                    setPrompt(null);
                  }}
                  // Selected tab = filled ink, pressed in (no shadow) ; the other one stands out, ready to tap.
                  className={`min-h-12 rounded-xl text-base font-bold ${mode === m ? "" : "manga-panel-sm manga-press"}`}
                  style={
                    mode === m
                      ? { background: "var(--ink)", color: "var(--pop)", border: "2px solid var(--ink)" }
                      : { background: "var(--surface)", color: "var(--ink)" }
                  }
                >
                  {m === "tomes" ? "Mes tomes" : `Mes lectures${read.size ? ` · ${read.size}` : ""}`}
                </button>
              ))}
            </div>
          )}
          {mode === "details" ? (
            <div className="manga-panel-sm flex items-center justify-between gap-3 rounded-2xl px-4 py-2" style={{ background: "var(--pop)", color: "var(--ink)" }}>
              <p className="text-base font-bold">Touche un tome pour voir ses détails.</p>
              <button type="button" onClick={() => setMode("tomes")} className="min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold" style={{ background: "var(--ink)", color: "white" }}>
                Terminé
              </button>
            </div>
          ) : (
            <p className="text-base font-bold" style={{ color: "var(--ink)" }}>{hint}</p>
          )}
          <VolumeGrid
            count={shownCount}
            mode={mode}
            owned={owned}
            read={read}
            covers={volumeCovers}
            fallbackCover={manga.cover_url ?? undefined}
            onTap={tapVolume}
            onExtend={canExtend && shownCount === gridCount ? () => setExtra((e) => e + 1) : undefined}
          />
          {shownCount < gridCount && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="manga-panel-sm manga-press min-h-12 rounded-2xl text-base font-bold"
              style={{ background: "var(--surface)", color: "var(--ink)" }}
            >
              Voir les {gridCount} tomes
            </button>
          )}
        </section>
      )}

      {onShelf && extras}

      {/* One message at a time, above the tab bar */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-6">
        {prompt ? (
          // A comic speech bubble : ink panel, tail at the bottom left
          <div role="dialog" aria-label="Ajouter les tomes d'avant" className="manga-panel pointer-events-auto relative flex w-full max-w-md flex-col gap-4 rounded-3xl p-4 pb-5">
            <BubbleTail />
            <p className="text-xl font-bold leading-snug" style={{ color: "var(--ink)" }}>
              Tu as aussi {prompt.kind === "lectures" ? "lu " : ""}
              {rangeLabel(prompt)}&nbsp;?
            </p>
            <div className="grid grid-cols-[1fr_1.4fr] gap-3">
              <button
                type="button"
                onClick={() => {
                  track("fill_prompt_answered", { answer: "no", tab: prompt.kind === "lectures" ? "lectures" : "tomes", volumes: prompt.to - prompt.from + 1 });
                  setPrompt(null);
                }}
                className="manga-panel-sm manga-press min-h-14 rounded-2xl text-lg font-bold"
                style={{ background: "var(--surface)", color: "var(--ink)" }}
              >
                Non
              </button>
              <button
                type="button"
                onClick={() => acceptPrompt(prompt)}
                className="manga-button min-h-14 rounded-2xl text-xl font-bold text-white"
                style={{ background: prompt.kind === "lectures" ? "var(--success)" : "var(--accent)" }}
              >
                Oui
              </button>
            </div>
          </div>
        ) : (
          (error || notice) && (
            <div
              role={error ? "alert" : "status"}
              className="manga-panel pointer-events-auto relative flex max-w-md items-center gap-2 rounded-2xl py-1 pl-4 pr-1 text-base font-bold"
              style={{ color: error ? "var(--danger)" : "var(--ink)" }}
            >
              <BubbleTail />
              <span className="py-2">{error ?? notice?.text}</span>
              {!error && notice?.undo && (
                <button
                  type="button"
                  onClick={() => {
                    notice.undo?.();
                    setNotice(null);
                  }}
                  className="manga-panel-sm manga-press min-h-11 shrink-0 rounded-xl px-3 text-sm font-bold"
                  style={{ background: "var(--surface)", color: "var(--accent)" }}
                >
                  Annuler
                </button>
              )}
              <button type="button" onClick={() => { setError(null); setNotice(null); }} aria-label="Fermer le message" className="flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: "var(--ink)" }}>
                <AppIcon name="close" size={16} />
              </button>
            </div>
          )
        )}
      </div>

      <SeriesMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        manga={manga}
        onShelf={onShelf}
        liked={liked}
        pending={isPending}
        run={run}
        onNotice={(text) => setNotice({ text })}
        onEditVolumes={() => setMode("details")}
      />

      {openVolume != null && (
        <VolumeSheet
          mangaId={manga.id}
          seriesTitle={manga.title}
          volumeNumber={openVolume}
          existing={ownedVolume}
          reading={openReading ? { status: openReading.status, finished_on: openReading.finished_on } : null}
          suggestedPrice={lastKnownPrice(volumes)}
          readingPending={reading.isPending}
          onReading={(intent) => act(intent, openVolume)}
          onClose={closeSheet}
          onSaved={handleSaved}
        />
      )}
      <ReadingToast toast={reading.toast} onClose={reading.clearToast} />
    </div>
  );
}

function ActionButton({ icon, label, on, disabled, onClick }: { icon: "heart" | "star" | "more"; label: string; on: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={icon === "more" ? undefined : on}
      className="manga-panel-sm manga-press flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center text-[13px] font-bold leading-tight disabled:opacity-60"
      style={on ? { background: "var(--accent)", color: "var(--accent-foreground)" } : { background: "var(--surface)", color: "var(--ink)" }}
    >
      <AppIcon name={icon} size={22} filled={on} />
      {label}
    </button>
  );
}

// Speech-bubble tail for the floating messages : a square turned 45°,
// half hidden inside the panel so its border joins the panel's.
function BubbleTail() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-2.75 left-8 h-5 w-5 rotate-45"
      style={{ background: "var(--surface)", borderRight: "3px solid var(--ink)", borderBottom: "3px solid var(--ink)" }}
    />
  );
}
