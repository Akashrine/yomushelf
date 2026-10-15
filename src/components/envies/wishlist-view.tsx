"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppIcon } from "@/components/app/app-icon";
import { Celebration } from "@/components/collection/celebration";
import type { CelebrationContent } from "@/components/collection/celebration-message";
import { formatPriceInput } from "@/components/collection/volume-fields";
import {
  acquireWishlistItem,
  addWishlistItem,
  removeWishlistItem,
  setWishlistPriority,
} from "@/app/(app)/envies/actions";
import { formatEur, summarizeWishlist } from "@/lib/collection/value";
import type { WishlistPriority } from "@/lib/types/database";

export type WishItem = {
  id: string;
  manga_id: string;
  volume_number: number | null;
  target_price: number | null;
  priority: WishlistPriority;
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

export function WishlistView({ items, series }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<CelebrationContent | null>(null);
  const clearCelebration = useCallback(() => setCelebration(null), []);

  const seriesById = new Map(series.map((s) => [s.manga_id, s]));
  const summary = summarizeWishlist(items);
  const priorityTotal = summarizeWishlist(items.filter((i) => i.priority === "high")).totalEur;

  const groups = [...new Set(items.map((i) => i.manga_id))]
    .map((id) => ({
      series: seriesById.get(id),
      manga_id: id,
      items: items
        .filter((i) => i.manga_id === id)
        .sort((a, b) => (a.volume_number ?? 0) - (b.volume_number ?? 0)),
    }))
    .sort((a, b) => {
      const ah = a.items.some((i) => i.priority === "high") ? 0 : 1;
      const bh = b.items.some((i) => i.priority === "high") ? 0 : 1;
      return ah - bh || (a.series?.title ?? "").localeCompare(b.series?.title ?? "");
    });

  function run(action: ActionFn, fd: FormData, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action(fd);
      if (!result.success) {
        setError(result.error ?? "Erreur. Réessaie.");
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
    run(acquireWishlistItem, fd, () =>
      setCelebration({
        message: `Tome ${item.volume_number} rejoint ta collection !`,
        sub:
          item.target_price != null
            ? how === "gift"
              ? `Un cadeau qui vaut ${formatEur(item.target_price)}`
              : `+${formatEur(item.target_price)} dans ta collection`
            : undefined,
      })
    );
  }

  function togglePriority(item: WishItem) {
    const fd = new FormData();
    fd.set("id", item.id);
    fd.set("priority", item.priority === "high" ? "low" : "high");
    run(setWishlistPriority, fd);
  }

  function remove(item: WishItem) {
    const fd = new FormData();
    fd.set("id", item.id);
    run(removeWishlistItem, fd);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Total to gather */}
      <section
        aria-labelledby="wish-total"
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{
          background:
            "radial-gradient(90% 120% at 100% 0%, rgba(248,192,74,0.22) 0%, transparent 55%), linear-gradient(160deg, #241a16 0%, #181212 100%)",
          border: "1px solid rgba(248,192,74,0.22)",
        }}
      >
        <CoinStack count={items.length} high={items.filter((i) => i.priority === "high").length} />
        <p id="wish-total" className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em]" style={{ color: "var(--gold)" }}>
          <AppIcon name="star" size={18} filled />
          Pour tout avoir
        </p>
        <p className="mt-2 text-5xl font-black tabular-nums text-gold-gradient sm:text-6xl">
          {formatEur(summary.totalEur)}
        </p>
        <p className="mt-2 max-w-[70%] text-sm" style={{ color: "#e9d9c6" }}>
          {summary.count === 0
            ? "Ta liste d'envies est vide."
            : `${summary.count} envie${summary.count > 1 ? "s" : ""}`}
          {priorityTotal > 0 && (
            <>
              {" "}· dont <strong style={{ color: "var(--gold)" }}>{formatEur(priorityTotal)}</strong> pour tes priorités
            </>
          )}
        </p>
        {summary.missingPriceCount > 0 && (
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            {summary.missingPriceCount} envie{summary.missingPriceCount > 1 ? "s" : ""} sans prix, pas comptée{summary.missingPriceCount > 1 ? "s" : ""} dans le total.
          </p>
        )}
      </section>

      {error && <p className="text-sm" role="alert" style={{ color: "var(--accent-hover)" }}>{error}</p>}

      {/* Wishes by series */}
      {groups.map((g) => {
        const s = g.series;
        const nextWish = s ? g.items.find((i) => i.volume_number === s.nextVolume) : undefined;
        const nextPrice = nextWish?.target_price ?? s?.lastPrice ?? null;
        return (
          <section
            key={g.manga_id}
            className="rounded-3xl p-4 sm:p-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex gap-4">
              <Link
                href={`/bibliotheque/${g.manga_id}`}
                className="shrink-0 overflow-hidden rounded-lg"
                style={{
                  width: 60,
                  aspectRatio: "2/3",
                  background: s?.cover_url
                    ? `url(${s.cover_url}) center/cover no-repeat, #1a1010`
                    : "linear-gradient(160deg,#3a2a12 0%,#1a120a 100%)",
                }}
                aria-label={`Voir ${s?.title ?? "la série"}`}
              />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-bold">{s?.title ?? "Série"}</h2>
                {s && (
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    Le tome suivant (t.{s.nextVolume})
                    {nextPrice != null ? (
                      <> coûte <strong className="tabular-nums" style={{ color: "var(--gold)" }}>{formatEur(nextPrice)}</strong></>
                    ) : (
                      " : prix à trouver"
                    )}
                  </p>
                )}
              </div>
            </div>

            <ul className="mt-4 flex flex-col gap-2">
              {g.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2.5"
                  style={{ background: "var(--surface-raised)" }}
                >
                  <button
                    type="button"
                    onClick={() => togglePriority(item)}
                    disabled={isPending}
                    aria-pressed={item.priority === "high"}
                    aria-label={item.priority === "high" ? "Retirer des priorités" : "Mettre en priorité"}
                    className="flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90"
                    style={{ color: item.priority === "high" ? "var(--gold)" : "var(--muted)" }}
                  >
                    <AppIcon name="star" size={20} filled={item.priority === "high"} />
                  </button>
                  <span className="font-bold">
                    {item.volume_number != null ? `Tome ${item.volume_number}` : "Toute la série"}
                  </span>
                  <span className="tabular-nums font-semibold" style={{ color: item.target_price != null ? "var(--gold)" : "var(--muted)" }}>
                    {item.target_price != null ? formatEur(item.target_price) : "prix ?"}
                  </span>
                  <span className="ml-auto flex items-center gap-1.5">
                    {item.volume_number != null && (
                      <>
                        <button
                          type="button"
                          onClick={() => acquire(item, "bought")}
                          disabled={isPending}
                          className="rounded-xl px-3 py-1.5 text-sm font-bold transition-transform active:scale-95 disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))", color: "white" }}
                        >
                          Acheté !
                        </button>
                        <button
                          type="button"
                          onClick={() => acquire(item, "gift")}
                          disabled={isPending}
                          className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-bold transition-transform active:scale-95 disabled:opacity-50"
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
                      aria-label="Supprimer cette envie"
                      className="flex h-9 w-9 items-center justify-center rounded-full"
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
        onSubmit={(fd, title, volume) =>
          run(addWishlistItem, fd, () => setCelebration({ message: `${title} t.${volume} dans tes envies` }))
        }
      />

      {celebration && (
        <Celebration message={celebration.message} sub={celebration.sub} onDone={clearCelebration} />
      )}
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
  const [high, setHigh] = useState(false);

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
    fd.set("priority", high ? "high" : "low");
    onSubmit(fd, current.title, volume);
  }

  const field = "rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2";
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
          Prix (€)
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setHigh((h) => !h)}
          aria-pressed={high}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"
          style={{ background: high ? "rgba(248,192,74,0.14)" : "var(--surface-raised)", color: high ? "var(--gold)" : "var(--muted)" }}
        >
          <AppIcon name="star" size={16} filled={high} />
          {high ? "Priorité haute" : "Priorité basse"}
        </button>
        <button
          type="submit"
          disabled={disabled || !volume}
          className="rounded-2xl px-5 py-3 text-sm font-bold disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-deep))", color: "#2a1a05" }}
        >
          Ajouter à mes envies
        </button>
      </div>
    </form>
  );
}

// One coin per wish, gold for priorities. Pure decoration.
function CoinStack({ count, high }: { count: number; high: number }) {
  const coins = Math.min(count, 10);
  if (coins === 0) return null;
  return (
    <div className="pointer-events-none absolute bottom-6 right-6 flex flex-col-reverse items-center" aria-hidden="true">
      {Array.from({ length: coins }, (_, i) => (
        <span
          key={i}
          className="spine-drop -mt-2.5 block h-5 w-16 rounded-[50%] sm:w-20"
          style={{
            background: i < high
              ? "linear-gradient(180deg, #ffe39a 0%, var(--gold) 50%, var(--gold-deep) 100%)"
              : "linear-gradient(180deg, #c9b48a 0%, #8a7550 100%)",
            boxShadow: "0 2px 0 rgba(0,0,0,0.35), inset 0 -3px 0 rgba(0,0,0,0.2)",
            marginLeft: `${((i * 7) % 5) - 2}px`,
            animationDelay: `${i * 90}ms`,
          }}
        />
      ))}
    </div>
  );
}
