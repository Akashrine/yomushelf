"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/app/app-icon";
import { Cover } from "@/components/collection/reader-home";
import { addWishlistItem } from "@/app/(app)/envies/actions";
import { restoreSuggestions, saveDeclaredTastes } from "@/app/(app)/decouvrir/actions";
import { GENRE_LABELS, GENRES, ageLabel, matchesFilters, type CatalogueEntry, type DeclaredTastes, type DiscoveryScope } from "@/lib/discovery/suggest";
import type { DeckCard } from "@/lib/discovery/deck";
import { titleKey } from "@/lib/manga-api/merge";
import { SwipeDeck } from "./swipe-deck";

export type DiscoverCard = { entry: CatalogueEntry; reason?: string; note?: string | null };
export type Selection = { slug: string; title: string; description: string | null; items: DiscoverCard[] };
export type DiscoverRow = { key: string; title: string; subtitle?: string | null; items: DiscoverCard[] };
export type Featured = { card: DiscoverCard; synopsis: string | null } | null;

type Props = {
  featured: Featured;
  deck: DeckCard[];
  rows: DiscoverRow[];
  catalogue: CatalogueEntry[];
  onShelf: string[];
  wished: string[];
  declared: DeclaredTastes;
  scope: DiscoveryScope;
  dismissedCount: number;
  hasHistory: boolean;
};

const AGES = [
  { value: null, label: "Tous" },
  { value: 8, label: "8 ans" },
  { value: 10, label: "10 ans" },
  { value: 12, label: "12 ans" },
  { value: 14, label: "14 ans" },
] as const;

const NETWORK_ERROR = "Impossible de confirmer l'enregistrement. Vérifie ta connexion puis réessaie.";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Toast = { ok: boolean; text: string; undo?: () => void };

// Découvrir, like a streaming home : one featured series, the card game
// one tap away, then rows of covers. Every cover opens the series page,
// where the reader decides. An age chip row filters everything.
export function DiscoverView({ featured, deck, rows, catalogue, onShelf, wished, declared, scope, dismissedCount, hasHistory }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<Toast | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [maxAge, setMaxAge] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState(false);

  const shelfSet = useMemo(() => new Set(onShelf), [onShelf]);
  const wishSet = useMemo(() => new Set(wished), [wished]);
  const fits = (e: CatalogueEntry) => maxAge == null || matchesFilters(e, { territory: null, genre: null, maxAge, status: null, length: null });

  const searching = query.trim().length >= 2;
  const results = useMemo(
    () => (searching ? catalogue.filter((c) => titleKey(c.title).includes(titleKey(query)) || titleKey(c.author ?? "").includes(titleKey(query))).slice(0, 30) : []),
    [catalogue, query, searching]
  );

  function run(id: string, action: () => Promise<{ success: boolean; error?: string }>, ok: string) {
    setToast(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await action().catch(() => ({ success: false as const, error: NETWORK_ERROR }));
      setPendingId(null);
      if (!result.success) {
        setToast({ ok: false, text: result.error ?? NETWORK_ERROR });
        return;
      }
      setToast({ ok: true, text: ok });
      router.refresh();
    });
  }

  const form = (entries: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(entries)) fd.set(k, v);
    return fd;
  };

  const badge = (id: string) => (shelfSet.has(id) ? "shelf" : wishSet.has(id) ? "wish" : null);
  const visibleRows = rows.map((r) => ({ ...r, items: r.items.filter((i) => fits(i.entry)) })).filter((r) => r.items.length >= 3);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl sm:text-4xl">Découvrir</h1>
        <label className="relative block">
          <span className="sr-only">Chercher un manga</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }}>
            <AppIcon name="search" size={20} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Un titre, un auteur…"
            autoComplete="off"
            className="min-h-12 w-full rounded-2xl pl-12 pr-4 text-base outline-none focus:ring-2"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          />
        </label>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6" role="group" aria-label="Âge du lecteur">
          {AGES.map((a) => {
            const on = maxAge === a.value;
            return (
              <button
                key={a.label}
                type="button"
                aria-pressed={on}
                onClick={() => setMaxAge(a.value)}
                className="min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold"
                style={on ? { background: "var(--foreground)", color: "var(--background)" } : { background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                {a.value == null ? "Tous les âges" : `Dès ${a.label}`}
              </button>
            );
          })}
        </div>
        {maxAge != null && (
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Seulement les séries avec un âge conseillé par le CNLJ (BnF). C&apos;est une indication, pas une garantie.
          </p>
        )}
      </header>

      {searching ? (
        <section aria-label="Résultats" className="flex flex-col gap-3">
          {results.filter((r) => fits(r)).length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Rien trouvé dans notre sélection.{" "}
              <Link href="/ajouter" className="font-semibold underline">Chercher partout</Link>
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6">
              {results.filter((r) => fits(r)).map((entry) => (
                <li key={entry.id}>
                  <Poster card={{ entry }} badge={badge(entry.id)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          {featured && fits(featured.card.entry) && (
            <Hero
              featured={featured}
              wished={wishSet.has(featured.card.entry.id)}
              onShelf={shelfSet.has(featured.card.entry.id)}
              pending={isPending && pendingId === featured.card.entry.id}
              onWish={() =>
                run(featured.card.entry.id, () => addWishlistItem(form({ manga_id: featured.card.entry.id, volume_number: "1" })), `${featured.card.entry.title} est dans tes envies.`)
              }
            />
          )}

          {deck.length > 0 && (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="flex items-center gap-4 rounded-3xl p-4 text-left transition-transform active:scale-[0.98]"
              style={{ background: "var(--foreground)", color: "var(--background)" }}
            >
              <span className="relative h-20 w-24 shrink-0" aria-hidden="true">
                {deck.slice(0, 3).map((c, i) => (
                  <span key={c.entry.id} className="absolute top-0 h-20 w-14" style={{ left: i * 18, transform: `rotate(${(i - 1) * 8}deg)`, zIndex: 3 - i }}>
                    <Cover shelf={{ manga_id: c.entry.id, title: c.entry.title, cover_url: c.entry.cover_url }} volume={1} full bare />
                  </span>
                ))}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-serif text-xl font-semibold">Le jeu des cartes</span>
                <span className="text-sm opacity-80">Une série à la fois : tu la veux, ou pas pour toi&nbsp;?</span>
              </span>
              <span className="ml-auto shrink-0"><AppIcon name="play" size={24} filled /></span>
            </button>
          )}

          {visibleRows.map((r) => (
            <Row key={r.key} row={r} badge={badge} />
          ))}

          {dismissedCount > 0 && (
            <button
              type="button"
              onClick={() => run("restore-all", () => restoreSuggestions(new FormData()), "Les séries écartées peuvent revenir.")}
              className="flex min-h-11 items-center self-start text-sm underline underline-offset-4"
              style={{ color: "var(--muted)" }}
            >
              {dismissedCount} série{dismissedCount > 1 ? "s" : ""} écartée{dismissedCount > 1 ? "s" : ""} · Tout réafficher
            </button>
          )}

          <TastesEditor
            key={`${declared.liked.join(",")}|${declared.avoided.join(",")}|${scope}`}
            declared={declared}
            scope={scope}
            openByDefault={!hasHistory && declared.liked.length === 0}
            pending={isPending && pendingId === "tastes"}
            onSave={(t) => run("tastes", () => saveDeclaredTastes(t), "Tes goûts sont enregistrés. Les suggestions sont à jour.")}
          />
        </>
      )}

      {playing && <DeckOverlay deck={deck} onClose={() => setPlaying(false)} />}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-6">
        {toast && (
          <div
            role={toast.ok ? "status" : "alert"}
            className="pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl py-1 pl-4 pr-1 text-sm font-semibold shadow-lg"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: toast.ok ? "var(--foreground)" : "var(--danger)" }}
          >
            <span className="py-2">{toast.text}</span>
            <button type="button" onClick={() => setToast(null)} aria-label="Fermer le message" className="flex h-11 w-11 shrink-0 items-center justify-center">
              <AppIcon name="close" size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// The featured series : its cover blown up and blurred as a backdrop.
function Hero({ featured, wished, onShelf, pending, onWish }: { featured: NonNullable<Featured>; wished: boolean; onShelf: boolean; pending: boolean; onWish: () => void }) {
  const { entry, reason } = featured.card;
  const href = `/bibliotheque/${entry.id}`;
  return (
    <section aria-label="À la une" className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-3xl" style={{ background: "var(--foreground)" }}>
      {entry.cover_url && (
        <span
          aria-hidden="true"
          className="absolute inset-0 scale-125 opacity-60 blur-2xl"
          style={{ background: `url(${entry.cover_url}) center/cover no-repeat` }}
        />
      )}
      <span aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(29,36,51,0.15) 0%, rgba(29,36,51,0.85) 100%)" }} />
      <div className="relative flex flex-col gap-4 p-5 text-white sm:flex-row sm:items-end sm:p-8">
        <Link href={href} className="w-36 shrink-0 self-center overflow-hidden rounded-xl shadow-2xl sm:w-44 sm:self-auto" style={{ aspectRatio: "2/3" }}>
          <Cover shelf={{ manga_id: entry.id, title: entry.title, cover_url: entry.cover_url }} volume={1} full bare />
        </Link>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">{reason ?? "À la une"}</p>
          <h2 className="text-3xl leading-tight text-white sm:text-4xl">{entry.title}</h2>
          <p className="text-sm opacity-80">
            {[entry.genres.slice(0, 3).map((g) => cap(GENRE_LABELS[g] ?? g)).join(" · "), entry.total_volumes ? `${entry.total_volumes} tomes` : null, ageLabel(entry)]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {featured.synopsis && <p className="line-clamp-3 max-w-[60ch] text-sm leading-relaxed opacity-90">{featured.synopsis}</p>}
          <div className="mt-1 grid grid-cols-2 gap-2 sm:flex">
            {onShelf ? (
              <Link href={href} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-base font-bold" style={{ background: "white", color: "var(--foreground)" }}>
                <AppIcon name="books" size={18} /> Chez toi
              </Link>
            ) : (
              <button
                type="button"
                onClick={onWish}
                disabled={pending || wished}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-base font-bold disabled:opacity-80"
                style={{ background: "white", color: "var(--foreground)" }}
              >
                <AppIcon name="star" size={18} filled={wished} /> {wished ? "Dans tes envies" : "Je le veux"}
              </button>
            )}
            <Link href={href} className="flex min-h-12 items-center justify-center rounded-2xl px-5 text-base font-semibold" style={{ background: "rgba(255,255,255,0.18)", color: "white" }}>
              Voir la fiche
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ row, badge }: { row: DiscoverRow; badge: (id: string) => "shelf" | "wish" | null }) {
  return (
    <section aria-labelledby={`h-${row.key}`} className="flex flex-col gap-3">
      <div>
        <h2 id={`h-${row.key}`} className="text-xl sm:text-2xl">{row.title}</h2>
        {row.subtitle && <p className="text-sm" style={{ color: "var(--muted)" }}>{row.subtitle}</p>}
      </div>
      <ul className="no-scrollbar -mx-4 flex snap-x scroll-pl-4 gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-pl-6 sm:px-6">
        {row.items.map((c) => (
          <li key={c.entry.id} className="w-28 shrink-0 snap-start sm:w-36">
            <Poster card={c} badge={badge(c.entry.id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Poster({ card, badge }: { card: DiscoverCard; badge: "shelf" | "wish" | null }) {
  const { entry } = card;
  return (
    <Link href={`/bibliotheque/${entry.id}`} className="group flex flex-col gap-1.5">
      <span className="relative block w-full transition-transform group-active:scale-95" style={{ aspectRatio: "2/3" }}>
        <Cover shelf={{ manga_id: entry.id, title: entry.title, cover_url: entry.cover_url }} volume={1} full bare />
        {badge && (
          <span
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full"
            style={badge === "shelf" ? { background: "var(--accent)", color: "white" } : { background: "white", color: "var(--gold)" }}
          >
            <AppIcon name={badge === "shelf" ? "check" : "star"} size={15} strokeWidth={3} filled={badge === "wish"} />
            <span className="sr-only">{badge === "shelf" ? "Chez toi" : "Dans tes envies"}</span>
          </span>
        )}
      </span>
      <span className="line-clamp-2 text-sm font-semibold leading-snug">{entry.title}</span>
    </Link>
  );
}

// The card game, full screen : nothing else on screen while playing.
function DeckOverlay({ deck, onClose }: { deck: DeckCard[]; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={() => {
        onClose();
        router.refresh();
      }}
      aria-label="Le jeu des cartes"
      className="m-0 h-dvh max-h-none w-full max-w-none p-0"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <div className="mx-auto flex min-h-full max-w-md flex-col gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <p className="font-serif text-xl font-semibold">Le jeu des cartes</p>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Fermer le jeu" className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: "var(--surface-raised)" }}>
            <AppIcon name="close" size={20} />
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center">
          <SwipeDeck deck={deck} />
        </div>
      </div>
    </dialog>
  );
}

// Genres the reader likes or avoids. Three states per genre, plain words.
function TastesEditor({
  declared,
  scope,
  openByDefault,
  pending,
  onSave,
}: {
  declared: DeclaredTastes;
  scope: DiscoveryScope;
  openByDefault: boolean;
  pending: boolean;
  onSave: (t: DeclaredTastes & { scope: DiscoveryScope }) => void;
}) {
  const [liked, setLiked] = useState(new Set(declared.liked));
  const [avoided, setAvoided] = useState(new Set(declared.avoided));
  const [youth, setYouth] = useState(scope === "youth_verified");
  const same = (a: Set<string>, b: string[]) => [...a].sort().join() === [...b].sort().join();
  const changed = !same(liked, declared.liked) || !same(avoided, declared.avoided) || youth !== (scope === "youth_verified");

  function cycle(g: string) {
    // neutral → j'aime → j'évite → neutral
    if (liked.has(g)) {
      setLiked((s) => new Set([...s].filter((x) => x !== g)));
      setAvoided((s) => new Set(s).add(g));
    } else if (avoided.has(g)) {
      setAvoided((s) => new Set([...s].filter((x) => x !== g)));
    } else {
      setLiked((s) => new Set(s).add(g));
    }
  }

  return (
    <section id="mes-gouts" aria-label="Mes goûts" className="scroll-mt-20">
      <details open={openByDefault} className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <summary className="flex min-h-11 cursor-pointer flex-col justify-center">
          <span className="block text-lg font-bold">Mes goûts</span>
          <span className="block text-sm" style={{ color: "var(--muted)" }}>
            {declared.liked.length || declared.avoided.length
              ? [
                  declared.liked.length ? `Tu aimes : ${declared.liked.map((g) => GENRE_LABELS[g] ?? g).join(", ")}` : null,
                  declared.avoided.length ? `Tu évites : ${declared.avoided.map((g) => GENRE_LABELS[g] ?? g).join(", ")}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Dis ce qui te plaît : les suggestions démarrent même sans historique."}
          </span>
        </summary>
        <p className="mb-3 mt-3 text-sm" style={{ color: "var(--muted)" }}>
          Touche un genre : une fois pour « j&apos;aime », deux fois pour « j&apos;évite », trois fois pour revenir à neutre.
        </p>
        <ul className="flex flex-wrap gap-2" aria-label="Genres">
          {GENRES.map((g) => {
            const state = liked.has(g) ? "aime" : avoided.has(g) ? "evite" : null;
            return (
              <li key={g}>
                <button
                  type="button"
                  onClick={() => cycle(g)}
                  aria-label={`${cap(GENRE_LABELS[g])} : ${state === "aime" ? "j'aime" : state === "evite" ? "j'évite" : "neutre"}`}
                  className="flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold"
                  style={
                    state === "aime"
                      ? { background: "var(--read)", color: "white" }
                      : state === "evite"
                        ? { background: "var(--background)", color: "var(--muted)", border: "1.5px dashed var(--border)", textDecoration: "line-through" }
                        : { background: "var(--surface-raised)", border: "1px solid var(--border)" }
                  }
                >
                  {state === "aime" && <AppIcon name="check" size={14} strokeWidth={3} />}
                  {cap(GENRE_LABELS[g])}
                </button>
              </li>
            );
          })}
        </ul>
        <fieldset className="mt-5 flex flex-col gap-1">
          <legend className="mb-1 text-sm font-semibold">Ce que Découvrir te propose</legend>
          <label className="flex min-h-11 cursor-pointer items-start gap-2 text-sm">
            <input type="radio" name="scope" checked={!youth} onChange={() => setYouth(false)} className="mt-1 h-5 w-5 shrink-0" />
            <span>Tout le catalogue. Les séries sans âge vérifié sont signalées, et celles des magazines pour jeunes adultes ne sont proposées qu&apos;à qui en lit déjà.</span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-start gap-2 text-sm">
            <input type="radio" name="scope" checked={youth} onChange={() => setYouth(true)} className="mt-1 h-5 w-5 shrink-0" />
            <span>Seulement des séries recommandées pour la jeunesse par le CNLJ (Bibliothèque nationale de France). Moins de choix, et c&apos;est une indication, pas une garantie.</span>
          </label>
        </fieldset>
        <button
          type="button"
          onClick={() => onSave({ liked: [...liked], avoided: [...avoided], scope: youth ? "youth_verified" : "all" })}
          disabled={pending || !changed}
          className="mt-4 min-h-12 rounded-2xl px-5 text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))" }}
        >
          {pending ? "J'enregistre…" : "Enregistrer mes goûts"}
        </button>
      </details>
    </section>
  );
}

