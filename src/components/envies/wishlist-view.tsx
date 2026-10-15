"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppIcon } from "@/components/app/app-icon";
import { formatPriceInput } from "@/components/collection/volume-fields";
import { acquireWishlistItem, addWishlistItem, removeWishlistItem } from "@/app/(app)/envies/actions";
import { formatEur } from "@/lib/collection/value";

export type WishItem = {
  id: string;
  manga_id: string;
  volume_number: number | null;
  target_price: number | null;
};

export type WishSeries = {
  manga_id: string;
  title: string;
  cover_url: string | null;
  nextVolume: number;
  lastPrice: number | null;
};

type Props = {
  items: WishItem[];
  series: WishSeries[]; // every series in the collection, used for grouping + the add form
};

type ActionFn = (fd: FormData) => Promise<{ success: boolean; error?: string }>;

// Reader space : each wish shows its own price, never a total.
// Totals live in the parent space.
export function WishlistView({ items, series }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const seriesById = new Map(series.map((s) => [s.manga_id, s]));

  // Stable order : series title, then volume number.
  const groups = [...new Set(items.map((i) => i.manga_id))]
    .map((id) => ({
      series: seriesById.get(id),
      manga_id: id,
      items: items
        .filter((i) => i.manga_id === id)
        .sort((a, b) => (a.volume_number ?? 0) - (b.volume_number ?? 0)),
    }))
    .sort((a, b) => (a.series?.title ?? "").localeCompare(b.series?.title ?? "", "fr"));

  function run(action: ActionFn, fd: FormData, after?: () => void) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action(fd);
      if (!result.success) {
        setError(result.error ?? "Pas enregistré. Réessaie.");
        return;
      }
      after?.();
      router.refresh();
    });
  }

  function acquire(item: WishItem, how: "bought" | "gift") {
    const fd = new FormData();
    fd.set("id", item.id);
    fd.set("acquisition_type", how);
    run(acquireWishlistItem, fd, () => setNotice(`Tome ${item.volume_number} sur ton étagère !`));
  }

  function remove(item: WishItem) {
    const fd = new FormData();
    fd.set("id", item.id);
    run(removeWishlistItem, fd);
  }

  return (
    <div className="flex flex-col gap-5">
      {items.length === 0 && (
        <p className="rounded-3xl p-6 text-center" style={{ background: "var(--surface)", border: "1px dashed var(--border)" }}>
          <span className="block text-lg font-bold">Ta liste d&apos;envies est vide.</span>
          <span className="mt-1 block text-sm" style={{ color: "var(--muted)" }}>
            Note ici les tomes que tu aimerais avoir, avec leur prix.
          </span>
        </p>
      )}

      {error && <p className="text-sm" role="alert" style={{ color: "var(--accent-hover)" }}>{error}</p>}
      {notice && !error && <p className="text-sm font-semibold" role="status" style={{ color: "var(--read)" }}>{notice}</p>}

      {groups.map((g) => {
        const s = g.series;
        return (
          <section
            key={g.manga_id}
            className="rounded-3xl p-4 sm:p-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <Link href={`/bibliotheque/${g.manga_id}`} className="flex items-center gap-3">
              <span
                className="shrink-0 overflow-hidden rounded-lg"
                style={{
                  width: 44,
                  aspectRatio: "2/3",
                  background: s?.cover_url
                    ? `url(${s.cover_url}) center/cover no-repeat, #1a1010`
                    : "linear-gradient(160deg,#3a2a12 0%,#1a120a 100%)",
                }}
                aria-hidden="true"
              />
              <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{s?.title ?? "Série"}</h2>
            </Link>

            <ul className="mt-3 flex flex-col gap-2">
              {g.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-3 py-2.5"
                  style={{ background: "var(--surface-raised)" }}
                >
                  <span className="font-bold">
                    {item.volume_number != null ? `Tome ${item.volume_number}` : "Toute la série"}
                  </span>
                  <span
                    className="tabular-nums font-semibold"
                    style={{ color: item.target_price != null ? "var(--gold)" : "var(--muted)" }}
                  >
                    {item.target_price != null ? formatEur(item.target_price) : "prix inconnu"}
                  </span>
                  <span className="ml-auto flex items-center gap-1.5">
                    {item.volume_number != null && (
                      <>
                        <button
                          type="button"
                          onClick={() => acquire(item, "bought")}
                          disabled={isPending}
                          className="min-h-11 rounded-xl px-3 text-sm font-bold text-white transition-transform active:scale-95 disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))" }}
                        >
                          Acheté !
                        </button>
                        <button
                          type="button"
                          onClick={() => acquire(item, "gift")}
                          disabled={isPending}
                          className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-bold transition-transform active:scale-95 disabled:opacity-50"
                          style={{ background: "rgba(248,192,74,0.14)", color: "var(--gold)" }}
                        >
                          <AppIcon name="gift" size={15} /> Offert
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      disabled={isPending}
                      aria-label={`Retirer le tome ${item.volume_number ?? ""} de tes envies`}
                      className="flex h-11 w-11 items-center justify-center rounded-full"
                      style={{ color: "var(--muted)" }}
                    >
                      <AppIcon name="trash" size={17} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <AddWishForm
        series={series}
        disabled={isPending}
        onSubmit={(fd, title, volume) => run(addWishlistItem, fd, () => setNotice(`${title}, tome ${volume}, dans tes envies`))}
      />
    </div>
  );
}

function AddWishForm({
  series,
  disabled,
  onSubmit,
}: {
  series: WishSeries[];
  disabled: boolean;
  onSubmit: (fd: FormData, title: string, volume: string) => void;
}) {
  const first = series[0];
  const [mangaId, setMangaId] = useState(first?.manga_id ?? "");
  const current = series.find((s) => s.manga_id === mangaId);
  const [volume, setVolume] = useState(first ? String(first.nextVolume) : "");
  const [price, setPrice] = useState(first?.lastPrice != null ? formatPriceInput(first.lastPrice) : "");

  if (series.length === 0) {
    return (
      <p className="rounded-3xl p-5 text-center text-sm" style={{ background: "var(--surface)", color: "var(--muted)" }}>
        Ajoute d&apos;abord une série à ta bibliothèque pour noter tes envies.
      </p>
    );
  }

  function pickSeries(id: string) {
    setMangaId(id);
    const s = series.find((x) => x.manga_id === id);
    setVolume(s ? String(s.nextVolume) : "");
    setPrice(s?.lastPrice != null ? formatPriceInput(s.lastPrice) : "");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !volume) return;
    const fd = new FormData();
    fd.set("manga_id", current.manga_id);
    fd.set("volume_number", volume);
    fd.set("target_price", price);
    onSubmit(fd, current.title, volume);
  }

  const field = "min-h-11 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2";
  const fieldStyle = { background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" };

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl p-5"
      style={{ background: "var(--surface)", border: "1px dashed rgba(248,192,74,0.35)" }}
      aria-labelledby="add-wish-title"
    >
      <h2 id="add-wish-title" className="mb-4 flex items-center gap-2 text-base font-bold">
        <span style={{ color: "var(--gold)" }}><AppIcon name="plus" size={18} /></span>
        Ajouter une envie
      </h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>
          Série
          <select value={mangaId} onChange={(e) => pickSeries(e.target.value)} className={field} style={fieldStyle}>
            {series.map((s) => (
              <option key={s.manga_id} value={s.manga_id}>{s.title}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>
          Tome
          <input type="number" min={1} inputMode="numeric" value={volume} onChange={(e) => setVolume(e.target.value)} className={`${field} w-24 tabular-nums`} style={fieldStyle} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>
          Son prix (€)
          <input
            type="text"
            inputMode="decimal"
            value={price}
            placeholder="7,20"
            onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ""))}
            className={`${field} w-28 tabular-nums`}
            style={fieldStyle}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={disabled || !volume}
        className="mt-4 min-h-12 w-full rounded-2xl px-5 text-sm font-bold disabled:opacity-50 sm:w-auto"
        style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-deep))", color: "#2a1a05" }}
      >
        Ajouter à mes envies
      </button>
    </form>
  );
}
