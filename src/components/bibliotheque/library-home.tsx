"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/app/app-icon";
import { CurrentReading, Cover, ReadCount } from "@/components/collection/reader-home";
import { restoreSeries } from "@/app/(app)/bibliotheque/actions";
import { nextToRead, readerCounts, type SeriesShelf } from "@/lib/collection/reading";
import { titleKey } from "@/lib/manga-api/merge";

export type ShelfCard = {
  shelf: SeriesShelf;
  totalVolumes: number | null;
  wished: number[];
  isPrivate: boolean;
};

export type ArchivedSeries = { manga_id: string; title: string; read: number; owned: number };
export type WishPreview = { manga_id: string; title: string; volume_number: number | null };

type Props = {
  name: string | null;
  cards: ShelfCard[];
  archived: ArchivedSeries[];
  wishes: WishPreview[];
  wishCount: number;
};

type Filter = "toutes" | "a-lire" | "en-cours" | "tout-lu" | "sans-tomes";

function stateOf(card: ShelfCard): Exclude<Filter, "toutes"> {
  const s = card.shelf;
  if (s.reading.length) return "en-cours";
  if (s.owned.length === 0 && s.read.length === 0) return "sans-tomes";
  return nextToRead(s) ? "a-lire" : "tout-lu";
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "toutes", label: "Toutes" },
  { key: "en-cours", label: "En cours" },
  { key: "a-lire", label: "À lire" },
  { key: "tout-lu", label: "Tout lu" },
  { key: "sans-tomes", label: "Sans tomes" },
];

export function LibraryHome({ name, cards, archived, wishes, wishCount }: Props) {
  const [filter, setFilter] = useState<Filter>("toutes");
  const [query, setQuery] = useState("");
  const shelves = cards.map((c) => c.shelf);
  const { volumesRead, waitingAtHome } = readerCounts(shelves);

  const counts = useMemo(() => {
    const out: Record<Filter, number> = { toutes: cards.length, "a-lire": 0, "en-cours": 0, "tout-lu": 0, "sans-tomes": 0 };
    for (const c of cards) out[stateOf(c)]++;
    return out;
  }, [cards]);

  const visible = cards
    .filter((c) => filter === "toutes" || stateOf(c) === filter)
    .filter((c) => !query.trim() || titleKey(c.shelf.title).includes(titleKey(query)));

  if (cards.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Welcome name={name} />
        {archived.length > 0 && <ArchivedList archived={archived} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Ma bibliothèque</h1>
          {name && <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>Salut {name} !</p>}
        </div>
      </header>

      <section aria-labelledby="h-now" className="flex flex-col gap-3">
        <h2 id="h-now" className="sr-only">En ce moment</h2>
        <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <CurrentReading shelves={shelves} />
          <ReadCount volumesRead={volumesRead} waitingAtHome={waitingAtHome} shelves={shelves} />
        </div>
      </section>

      <section aria-labelledby="h-series" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="h-series" className="text-lg font-bold">
            Mes séries <span className="font-normal" style={{ color: "var(--muted)" }}>· {cards.length}</span>
          </h2>
          <Link
            href="/ajouter"
            className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
          >
            <AppIcon name="plus" size={16} strokeWidth={2.5} /> Ajouter un manga
          </Link>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer mes séries">
          {FILTERS.filter((f) => f.key === "toutes" || counts[f.key] > 0).map((f) => {
            const on = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(f.key)}
                className="min-h-10 rounded-full px-3.5 text-sm font-semibold"
                style={
                  on
                    ? { background: "var(--foreground)", color: "var(--background)" }
                    : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }
                }
              >
                {f.label} <span style={{ opacity: 0.7 }}>{counts[f.key]}</span>
              </button>
            );
          })}
        </div>

        {cards.length > 12 && (
          <label className="relative block">
            <span className="sr-only">Chercher dans mes séries</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }}>
              <AppIcon name="search" size={18} />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher dans mes séries"
              className="min-h-11 w-full rounded-xl pl-10 pr-3 text-base outline-none focus:ring-2"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            />
          </label>
        )}

        {visible.length === 0 ? (
          <p className="rounded-2xl p-5 text-center text-sm" style={{ background: "var(--surface)", color: "var(--muted)" }}>
            Aucune série ici.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 min-[560px]:grid-cols-3 lg:grid-cols-4">
            {visible.map((c) => (
              <li key={c.shelf.manga_id}>
                <SeriesCard card={c} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <WishesTeaser wishes={wishes} count={wishCount} />
      {archived.length > 0 && <ArchivedList archived={archived} />}
    </div>
  );
}

function Welcome({ name }: { name: string | null }) {
  return (
    <section
      className="flex flex-col items-start gap-4 rounded-3xl p-6 sm:p-10"
      style={{
        background: "radial-gradient(120% 100% at 0% 0%, rgba(255,106,61,0.18) 0%, transparent 60%), var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <h1 className="text-3xl font-black leading-tight sm:text-4xl">
        {name ? `Salut ${name} !` : "Bienvenue !"}
        <br />
        Tes mangas, là où tu en es.
      </h1>
      <p className="max-w-[46ch] text-base" style={{ color: "var(--muted)" }}>
        Ajoute les séries que tu as et dis où tu en es. Yomushelf te montre quoi lire ensuite, et ce que tu pourrais aimer.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/ajouter"
          className="flex min-h-12 items-center gap-2 rounded-2xl px-5 text-base font-bold text-white"
          style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))" }}
        >
          <AppIcon name="plus" size={18} strokeWidth={2.5} /> Ajouter un manga
        </Link>
        <Link
          href="/decouvrir"
          className="flex min-h-12 items-center gap-2 rounded-2xl px-5 text-base font-semibold"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
        >
          <AppIcon name="compass" size={18} /> Découvrir des séries
        </Link>
      </div>
    </section>
  );
}

// A series at a glance. Every state is written out, colour only helps.
function SeriesCard({ card }: { card: ShelfCard }) {
  const s = card.shelf;
  const read = new Set(s.read);
  const owned = new Set(s.owned);
  const unreadAtHome = s.owned.filter((v) => !read.has(v)).length;
  const highest = Math.max(0, ...s.owned, ...s.read, ...s.reading, ...card.wished);
  const total = card.totalVolumes && card.totalVolumes >= highest ? card.totalVolumes : null;
  const span = Math.max(total ?? highest, 1);
  const missing = total
    ? Array.from({ length: total }, (_, i) => i + 1).filter((v) => !owned.has(v) && !read.has(v)).length
    : Array.from({ length: highest }, (_, i) => i + 1).filter((v) => !owned.has(v) && !read.has(v)).length;
  const readOwned = s.owned.filter((v) => read.has(v)).length;
  const readElsewhere = s.read.filter((v) => !owned.has(v)).length;
  const next = nextToRead(s);
  const pct = (n: number) => `${(n / span) * 100}%`;

  const lines = [
    `${s.read.length} lu${s.read.length > 1 ? "s" : ""}`,
    `${s.owned.length} chez toi`,
  ];
  const sub = [
    missing ? `${missing} manquant${missing > 1 ? "s" : ""}` : null,
    card.wished.length ? `${card.wished.length} souhaité${card.wished.length > 1 ? "s" : ""}` : null,
  ].filter(Boolean);

  return (
    <Link
      href={`/bibliotheque/${s.slug}`}
      className="group flex h-full flex-col gap-2 rounded-2xl p-2.5 transition-colors"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="relative">
        {s.cover_url ? (
          <div
            className="w-full overflow-hidden rounded-xl"
            style={{ aspectRatio: "2/3", background: `url(${s.cover_url}) center/cover no-repeat, #1a1010` }}
            aria-hidden="true"
          />
        ) : (
          <div className="flex w-full items-stretch" style={{ aspectRatio: "2/3" }} aria-hidden="true">
            <Cover shelf={s} volume={next ? (next.kind === "gap" ? next.available : next.volume) : Math.max(1, highest)} full />
          </div>
        )}
        {s.reading.length > 0 && (
          <span className="absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: "var(--gold)", color: "#2a1a05" }}>
            En cours
          </span>
        )}
        {card.isPrivate && (
          <span className="absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: "var(--surface-raised)", color: "var(--foreground)" }}>
            Ajoutée par toi
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-sm font-bold leading-snug">{s.title}</p>
      <div
        className="flex h-2 w-full overflow-hidden rounded-full"
        style={{ background: "rgba(255,255,255,0.07)" }}
        aria-hidden="true"
      >
        <span style={{ width: pct(readOwned + readElsewhere), background: "var(--read)" }} />
        <span style={{ width: pct(unreadAtHome), background: "var(--sleep)" }} />
        <span style={{ width: pct(card.wished.filter((v) => !owned.has(v)).length), background: "var(--gold)" }} />
      </div>
      <p className="text-xs font-semibold">{lines.join(" · ")}</p>
      {sub.length > 0 && <p className="-mt-1.5 text-xs" style={{ color: "var(--muted)" }}>{sub.join(" · ")}</p>}
      {total == null && card.totalVolumes == null && <span className="sr-only">Nombre de tomes parus inconnu</span>}
    </Link>
  );
}

function WishesTeaser({ wishes, count }: { wishes: WishPreview[]; count: number }) {
  return (
    <section aria-labelledby="h-wishes" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="h-wishes" className="flex items-center gap-2 text-lg font-bold">
          <span style={{ color: "var(--gold)" }}><AppIcon name="star" size={18} filled /></span>
          Mes envies <span className="font-normal" style={{ color: "var(--muted)" }}>· {count}</span>
        </h2>
        <Link href="/envies" className="flex min-h-11 items-center gap-1 text-sm font-semibold" style={{ color: "var(--gold)" }}>
          Voir mes envies <AppIcon name="chevron-right" size={16} />
        </Link>
      </div>
      {count === 0 ? (
        <p className="rounded-2xl p-4 text-sm" style={{ background: "var(--surface)", color: "var(--muted)" }}>
          Pas encore d&apos;envie. Touche « Je le veux » sur un tome qui te manque, ou cherche des idées dans{" "}
          <Link href="/decouvrir" className="underline underline-offset-4">Découvrir</Link>.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {wishes.map((w) => (
            <li key={`${w.manga_id}-${w.volume_number}`}>
              <Link
                href={`/bibliotheque/${w.manga_id}`}
                className="flex min-h-10 items-center rounded-full px-3 text-sm font-semibold"
                style={{ background: "rgba(248,192,74,0.1)", border: "1px solid rgba(248,192,74,0.35)" }}
              >
                {w.title}
                {w.volume_number != null && <span style={{ color: "var(--muted)" }}>&nbsp;· tome {w.volume_number}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ArchivedList({ archived }: { archived: ArchivedSeries[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function restore(mangaId: string) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("manga_id", mangaId);
      const result = await restoreSeries(fd).catch(() => ({ success: false as const, error: "Pas enregistré. Vérifie ta connexion et réessaie." }));
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <details className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <summary className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold">
        <AppIcon name="archive" size={18} /> Séries retirées · {archived.length}
      </summary>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        Leurs tomes et tes lectures sont gardés. Tu peux les remettre quand tu veux.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {archived.map((a) => (
          <li key={a.manga_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2" style={{ background: "var(--surface-raised)" }}>
            <span className="text-sm">
              <strong>{a.title}</strong>{" "}
              <span style={{ color: "var(--muted)" }}>· {a.read} lus · {a.owned} tomes</span>
            </span>
            <button
              type="button"
              onClick={() => restore(a.manga_id)}
              disabled={isPending}
              className="min-h-10 rounded-xl px-3 text-sm font-semibold disabled:opacity-60"
              style={{ border: "1px solid var(--border)" }}
            >
              Remettre dans ma bibliothèque
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-sm" role="alert" style={{ color: "var(--accent-hover)" }}>{error}</p>}
    </details>
  );
}
