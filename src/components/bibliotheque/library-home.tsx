"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/app/app-icon";
import { Cover } from "@/components/collection/reader-home";
import { restoreSeries } from "@/app/(app)/bibliotheque/actions";
import type { SeriesShelf } from "@/lib/collection/reading";
import { titleKey } from "@/lib/manga-api/merge";

export type ShelfCard = {
  shelf: SeriesShelf;
  totalVolumes: number | null;
  isPrivate: boolean;
};

export type ArchivedSeries = { manga_id: string; title: string; read: number; owned: number };
export type WishPreview = { manga_id: string; title: string; cover_url: string | null; volume_number: number | null };

type Props = {
  name: string | null;
  cards: ShelfCard[];
  archived: ArchivedSeries[];
  wishes: WishPreview[];
  wishCount: number;
};

// The collection as a wall of covers, like a streaming catalogue : the
// covers are the interface. One number per series (how many at home), a
// tile to add another one, the wishes in a row underneath.
export function LibraryHome({ name, cards, archived, wishes, wishCount }: Props) {
  const [query, setQuery] = useState("");
  const visible = cards.filter((c) => !query.trim() || titleKey(c.shelf.title).includes(titleKey(query)));
  const volumes = cards.reduce((n, c) => n + c.shelf.owned.length, 0);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        {name && (
          <p
            className="manga-sticker mb-2 self-start rounded-full px-3 py-0.5 text-xs font-black uppercase tracking-widest"
            style={{ background: "var(--ink)", color: "var(--pop)", transform: "rotate(-2deg)" }}
          >
            Salut {name}
          </p>
        )}
        <h1 className="text-4xl sm:text-5xl" style={{ color: "var(--ink)" }}>Ma collection</h1>
        <p className="mt-1 text-sm font-semibold" style={{ color: "var(--muted)" }}>
          {cards.length} série{cards.length > 1 ? "s" : ""} · {volumes} tome{volumes > 1 ? "s" : ""}
        </p>
      </header>

      {cards.length > 12 && (
        <label className="relative -mt-3 block">
          <span className="sr-only">Chercher dans ma collection</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }}>
            <AppIcon name="search" size={18} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher une série"
            className="min-h-12 w-full rounded-2xl pl-11 pr-3 text-base focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            style={{ background: "var(--surface)", color: "var(--foreground)", border: "2px solid var(--ink)", boxShadow: "3px 3px 0 var(--ink)" }}
          />
        </label>
      )}

      <ul className="grid grid-cols-3 gap-x-3.5 gap-y-6 sm:grid-cols-4 lg:grid-cols-5">
        {visible.map((c) => (
          <li key={c.shelf.manga_id}>
            <Poster card={c} />
          </li>
        ))}
        {!query && (
          <li>
            <Link
              href="/ajouter"
              className="manga-halftone flex w-full flex-col items-center justify-center gap-3 rounded-xl transition-transform motion-safe:active:scale-95"
              style={{ aspectRatio: "2/3", border: "3px dashed var(--ink)", backgroundColor: "var(--surface)", color: "var(--ink)" }}
            >
              <span
                className="manga-sticker flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: "var(--pop)", color: "var(--ink)", transform: "rotate(-4deg)" }}
                aria-hidden="true"
              >
                <AppIcon name="plus" size={30} strokeWidth={3} />
              </span>
              <span className="font-display text-xl font-normal leading-none tracking-wide">Ajouter</span>
            </Link>
          </li>
        )}
      </ul>
      {query && visible.length === 0 && (
        <p className="-mt-4 text-sm" style={{ color: "var(--muted)" }}>Aucune série ne correspond.</p>
      )}

      <WishesRow wishes={wishes} count={wishCount} />
      {archived.length > 0 && <ArchivedList archived={archived} />}
    </div>
  );
}

function Poster({ card }: { card: ShelfCard }) {
  const s = card.shelf;
  const owned = s.owned.length;
  const total = card.totalVolumes && card.totalVolumes >= Math.max(0, ...s.owned) ? card.totalVolumes : null;
  const complete = total != null && owned >= total;
  return (
    <Link href={`/bibliotheque/${s.slug}`} className="group flex flex-col gap-1.5" aria-label={`${s.title}, ${owned} tome${owned > 1 ? "s" : ""}${total ? ` sur ${total}` : ""}`}>
      <span className="relative block w-full" style={{ aspectRatio: "2/3" }}>
        <span className="manga-panel-sm manga-press block h-full w-full overflow-hidden rounded-xl" style={{ background: "var(--surface-raised)" }}>
          <Cover shelf={s} volume={Math.max(1, ...s.owned)} full bare />
        </span>
        <span
          className="manga-sticker absolute -bottom-2 -right-1.5 flex items-center gap-1 rounded-lg px-2 py-0.5 text-sm font-black tabular-nums"
          style={{
            background: complete ? "var(--success)" : "var(--ink)",
            color: "white",
            borderWidth: 2,
            boxShadow: "2px 2px 0 var(--ink)",
            transform: "rotate(-3deg)",
          }}
        >
          {complete && <AppIcon name="check" size={13} strokeWidth={3} />}
          {owned}
          {total ? <span className="font-semibold">/{total}</span> : null}
        </span>
      </span>
      <span className="mt-1 line-clamp-2 text-sm font-bold leading-snug" style={{ color: "var(--ink)" }}>{s.title}</span>
    </Link>
  );
}

function WishesRow({ wishes, count }: { wishes: WishPreview[]; count: number }) {
  if (count === 0) {
    return (
      <section className="manga-panel flex flex-col items-start gap-3 rounded-3xl p-5">
        <h2 className="flex items-center gap-3 text-2xl sm:text-3xl" style={{ color: "var(--ink)" }}>
          <StarSticker /> Mes envies
        </h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Trouve ta prochaine série dans Découvrir.</p>
        <Link
          href="/decouvrir"
          className="manga-panel-sm manga-press flex min-h-12 items-center gap-2 rounded-2xl px-5 text-base font-bold"
          style={{ background: "var(--surface)", color: "var(--ink)" }}
        >
          <AppIcon name="compass" size={18} /> Découvrir
        </Link>
      </section>
    );
  }
  return (
    <section aria-labelledby="h-wishes" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="h-wishes" className="flex items-center gap-3 text-2xl sm:text-3xl" style={{ color: "var(--ink)" }}>
          <StarSticker />
          Mes envies
          <span
            className="manga-sticker rounded-lg px-2 py-0.5 font-sans text-sm font-black tabular-nums tracking-normal"
            style={{ background: "var(--ink)", color: "var(--pop)", borderWidth: 2, boxShadow: "2px 2px 0 var(--ink)" }}
          >
            {count}
          </span>
        </h2>
        <Link href="/envies" className="flex min-h-11 items-center gap-1 px-1 text-sm font-bold" style={{ color: "var(--accent)" }}>
          Tout voir <AppIcon name="chevron-right" size={16} />
        </Link>
      </div>
      <ul className="no-scrollbar -mx-4 flex snap-x scroll-pl-4 gap-3.5 overflow-x-auto px-4 pb-3 pt-1 sm:-mx-6 sm:scroll-pl-6 sm:px-6">
        {wishes.map((w) => (
          <li key={`${w.manga_id}-${w.volume_number}`} className="w-24 shrink-0 snap-start sm:w-28">
            <Link href={`/bibliotheque/${w.manga_id}`} className="flex flex-col gap-1.5">
              <span className="relative block w-full" style={{ aspectRatio: "2/3" }}>
                <span className="manga-panel-sm manga-press block h-full w-full overflow-hidden rounded-xl" style={{ background: "var(--surface-raised)" }}>
                  <Cover shelf={{ manga_id: w.manga_id, title: w.title, cover_url: w.cover_url }} volume={w.volume_number ?? 1} full bare />
                </span>
                {w.volume_number != null && (
                  <span
                    className="manga-sticker absolute -bottom-2 -right-1.5 rounded-lg px-2 py-0.5 text-xs font-black tabular-nums"
                    style={{ background: "var(--pop)", color: "var(--ink)", borderWidth: 2, boxShadow: "2px 2px 0 var(--ink)", transform: "rotate(-3deg)" }}
                  >
                    T{w.volume_number}
                  </span>
                )}
              </span>
              <span className="mt-1 line-clamp-2 text-xs font-bold leading-snug" style={{ color: "var(--ink)" }}>{w.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StarSticker() {
  return (
    <span
      aria-hidden="true"
      className="manga-sticker inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
      style={{ background: "var(--pop)", color: "var(--ink)", borderWidth: 2, boxShadow: "2px 2px 0 var(--ink)", transform: "rotate(-6deg)" }}
    >
      <AppIcon name="star" size={18} filled />
    </span>
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
    <details className="manga-panel-sm rounded-2xl p-4" style={{ background: "var(--surface)" }}>
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold" style={{ color: "var(--ink)" }}>
        <AppIcon name="archive" size={18} /> Séries retirées · {archived.length}
      </summary>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        Leurs tomes et tes lectures sont gardés. Tu peux les remettre quand tu veux.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {archived.map((a) => (
          <li key={a.manga_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2" style={{ background: "var(--surface-raised)", border: "2px solid var(--ink)" }}>
            <span className="text-sm">
              <strong>{a.title}</strong> <span style={{ color: "var(--muted)" }}>· {a.owned} tomes</span>
            </span>
            <button
              type="button"
              onClick={() => restore(a.manga_id)}
              disabled={isPending}
              aria-label={`Remettre ${a.title} dans ma collection`}
              className="manga-panel-sm manga-press min-h-11 rounded-xl px-4 text-sm font-bold disabled:opacity-60"
              style={{ background: "var(--surface)", color: "var(--ink)" }}
            >
              La remettre
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-sm" role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
    </details>
  );
}
