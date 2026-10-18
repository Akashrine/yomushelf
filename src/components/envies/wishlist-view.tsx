"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppIcon } from "@/components/app/app-icon";
import { formatPriceInput } from "@/components/collection/volume-fields";
import { acquireWishlistItem, addWishlistItem, removeWishlistItem, setWishPriority } from "@/app/(app)/envies/actions";
import { formatEur } from "@/lib/collection/value";

export type WishItem = {
  id: string;
  manga_id: string;
  volume_number: number | null;
  target_price: number | null; // indicative price typed by the reader
  priority: "high" | "low";
};

export type WishSeries = {
  manga_id: string;
  title: string;
  cover_url: string | null;
  nextVolume: number;
  lastPrice: number | null;
  estimate: number | null; // from prices the reader paid, shown as an estimate only
  estimateBasis: "series" | "average" | null;
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
  const [notice, setNotice] = useState<{ text: string; undo?: () => void } | null>(null);
  // "Je l'ai" asks how it arrived and the price really paid (optional).
  const [acquiring, setAcquiring] = useState<{ id: string; how: "bought" | "gift" } | null>(null);
  const [paid, setPaid] = useState("");

  const seriesById = new Map(series.map((s) => [s.manga_id, s]));

  // Series with a "prochain à acheter" first, then by title ; volumes in order.
  const groups = [...new Set(items.map((i) => i.manga_id))]
    .map((id) => ({
      series: seriesById.get(id),
      manga_id: id,
      items: items
        .filter((i) => i.manga_id === id)
        .sort((a, b) => (a.volume_number ?? 0) - (b.volume_number ?? 0)),
    }))
    .sort(
      (a, b) =>
        Number(b.items.some((i) => i.priority === "high")) - Number(a.items.some((i) => i.priority === "high")) ||
        (a.series?.title ?? "").localeCompare(b.series?.title ?? "", "fr")
    );
  const nextOnes = items.filter((i) => i.priority === "high" && i.volume_number != null);

  function run(action: ActionFn, fd: FormData, after?: () => void) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action(fd).catch(() => ({ success: false as const, error: "Impossible de confirmer l’enregistrement. Vérifie ta connexion puis réessaie." }));
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
    fd.set("price_eur", paid);
    run(acquireWishlistItem, fd, () => {
      setAcquiring(null);
      setPaid("");
      setNotice({ text: `Tome ${item.volume_number} sur ton étagère !` });
    });
  }

  function remove(item: WishItem) {
    const fd = new FormData();
    fd.set("id", item.id);
    const title = seriesById.get(item.manga_id)?.title ?? "Série";
    const label = item.volume_number != null ? `${title}, tome ${item.volume_number}` : title;
    run(removeWishlistItem, fd, () =>
      setNotice({
        text: `${label} retiré de tes envies.`,
        undo: () => {
          const back = new FormData();
          back.set("manga_id", item.manga_id);
          if (item.volume_number != null) back.set("volume_number", String(item.volume_number));
          if (item.target_price != null) back.set("target_price", String(item.target_price));
          back.set("priority", item.priority);
          run(addWishlistItem, back, () => setNotice({ text: `${label} est de retour dans tes envies.` }));
        },
      })
    );
  }

  function togglePriority(item: WishItem) {
    const fd = new FormData();
    fd.set("id", item.id);
    fd.set("priority", item.priority === "high" ? "low" : "high");
    run(setWishPriority, fd, () =>
      setNotice({ text: item.priority === "high" ? "Retiré de tes prochains tomes." : "Ajouté à tes prochains tomes." })
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {items.length === 0 && (
        <p className="manga-panel rounded-3xl p-6 text-center">
          <span className="block font-display text-3xl font-normal leading-none tracking-wide" style={{ color: "var(--ink)" }}>Ta liste d&apos;envies est vide.</span>
          <span className="mt-1 block text-sm" style={{ color: "var(--muted)" }}>
            Note ici les tomes que tu aimerais avoir, avec leur prix.
          </span>
        </p>
      )}

      {nextOnes.length > 0 && (
        <section aria-labelledby="h-prochains" className="manga-panel rounded-3xl p-4 sm:p-5" style={{ background: "radial-gradient(circle, rgba(29,36,51,0.13) 1.2px, transparent 1.6px) 0 0 / 11px 11px, var(--pop)", color: "var(--ink)" }}>
          <h2 id="h-prochains" className="flex items-center gap-2 text-2xl sm:text-3xl">
            <AppIcon name="star" size={22} filled /> Mes prochains tomes
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {nextOnes.map((i) => (
              <li key={i.id} className="rounded-full px-3 py-1.5 font-bold" style={{ background: "var(--surface)", color: "var(--ink)", border: "2px solid var(--ink)" }}>
                {seriesById.get(i.manga_id)?.title ?? "Série"} · tome {i.volume_number}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Feedback stays in view, wherever the button was. */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-6">
        {(error || notice) && (
          <div
            role={error ? "alert" : "status"}
            className="manga-panel pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl py-1 pl-4 pr-1 text-sm font-bold"
            style={{ color: error ? "var(--danger)" : "var(--ink)" }}
          >
            <span className="py-2">{error ?? notice?.text}</span>
            {!error && notice?.undo && (
              <button type="button" onClick={notice.undo} className="min-h-11 shrink-0 px-2 underline underline-offset-4">
                Annuler
              </button>
            )}
            <button type="button" onClick={() => { setError(null); setNotice(null); }} aria-label="Fermer le message" className="flex h-11 w-11 shrink-0 items-center justify-center">
              <AppIcon name="close" size={16} />
            </button>
          </div>
        )}
      </div>

      {groups.map((g) => {
        const s = g.series;
        return (
          <section
            key={g.manga_id}
            className="manga-panel rounded-3xl p-4 sm:p-5"
          >
            <Link href={`/bibliotheque/${g.manga_id}`} className="flex min-h-11 items-center gap-3">
              <span
                className="manga-panel-sm shrink-0 overflow-hidden rounded-lg"
                style={{
                  width: 48,
                  aspectRatio: "2/3",
                  background: s?.cover_url
                    ? `url(${s.cover_url}) center/cover no-repeat, var(--surface-raised)`
                    : "radial-gradient(circle, rgba(18,21,29,0.16) 1px, transparent 1.4px) 0 0 / 8px 8px, var(--pop)",
                }}
                aria-hidden="true"
              />
              <h2 className="min-w-0 flex-1 truncate py-1 text-2xl sm:text-3xl" style={{ color: "var(--ink)" }}>{s?.title ?? "Série"}</h2>
            </Link>

            <ul className="mt-4 flex flex-col gap-3">
              {g.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-3 py-2.5"
                  style={{ background: "var(--surface-raised)", border: "2px solid var(--ink)" }}
                >
                  <span className="font-display text-xl font-normal leading-none tracking-wide" style={{ color: "var(--ink)" }}>
                    {item.volume_number != null ? `Tome ${item.volume_number}` : "Toute la série"}
                  </span>
                  <span
                    className="tabular-nums font-semibold"
                    style={{ color: item.target_price != null ? "var(--gold)" : "var(--muted)" }}
                  >
                    {item.target_price != null
                      ? formatEur(item.target_price)
                      : item.volume_number == null
                        ? "série entière, non chiffrée"
                        : s?.estimate != null
                          ? `≈ ${formatEur(s.estimate)}`
                          : "prix inconnu"}
                  </span>
                  {item.target_price == null && item.volume_number != null && s?.estimate != null && (
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      {s.estimateBasis === "series" ? "d'après ton dernier prix payé pour cette série" : "d'après ton prix moyen payé"}
                    </span>
                  )}
                  <span className="ml-auto flex flex-wrap items-center gap-1.5">
                    {item.volume_number != null && (
                      <button
                        type="button"
                        onClick={() => togglePriority(item)}
                        disabled={isPending}
                        aria-pressed={item.priority === "high"}
                        className="manga-panel-sm manga-press flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-bold disabled:opacity-50"
                        style={item.priority === "high" ? { background: "var(--pop)", color: "var(--ink)" } : { background: "var(--surface)", color: "var(--ink)" }}
                      >
                        <AppIcon name="star" size={15} filled={item.priority === "high"} /> {item.priority === "high" ? "Prochain" : "Mettre en prochain"}
                      </button>
                    )}
                    {item.volume_number == null && (
                      <Link
                        href={`/ajouter?serie=${item.manga_id}`}
                        className="manga-panel-sm manga-press flex min-h-11 items-center rounded-xl px-4 text-sm font-bold"
                        style={{ background: "var(--accent)", color: "white" }}
                      >
                        J&apos;ai eu des tomes
                      </Link>
                    )}
                    {item.volume_number != null && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setPaid("");
                            setAcquiring({ id: item.id, how: "bought" });
                          }}
                          disabled={isPending}
                          className="manga-panel-sm manga-press min-h-11 rounded-xl px-4 text-sm font-bold disabled:opacity-50"
                          style={{ background: "var(--accent)", color: "white" }}
                        >
                          Acheté !
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaid("");
                            setAcquiring({ id: item.id, how: "gift" });
                          }}
                          disabled={isPending}
                          className="manga-panel-sm manga-press flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-bold disabled:opacity-50"
                          style={{ background: "var(--pop)", color: "var(--ink)" }}
                        >
                          <AppIcon name="gift" size={15} /> Offert
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      disabled={isPending}
                      aria-label={item.volume_number != null ? `Retirer le tome ${item.volume_number} de tes envies` : `Retirer ${s?.title ?? "cette série"} de tes envies`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-[var(--surface)]"
                      style={{ color: "var(--muted)" }}
                    >
                      <AppIcon name="trash" size={17} />
                    </button>
                  </span>
                  {acquiring?.id === item.id && (
                    <form
                      className="flex w-full flex-wrap items-end gap-2 pt-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        acquire(item, acquiring.how);
                      }}
                    >
                      <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>
                        {acquiring.how === "gift" ? "Son prix en magasin (facultatif)" : "Prix payé (facultatif)"}
                        <input
                          value={paid}
                          onChange={(e) => setPaid(e.target.value.replace(/[^\d.,]/g, ""))}
                          inputMode="decimal"
                          placeholder={item.target_price != null ? String(item.target_price).replace(".", ",") : "7,20"}
                          className="min-h-11 w-28 rounded-xl px-3 text-base tabular-nums outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
                          style={{ background: "var(--surface)", border: "2px solid var(--ink)", color: "var(--foreground)" }}
                          autoFocus
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="manga-panel-sm manga-press min-h-12 rounded-xl px-4 text-sm font-bold disabled:opacity-60"
                        style={{ background: "var(--accent)", color: "white" }}
                      >
                        {acquiring.how === "gift" ? "C'est un cadeau !" : "Je l'ai acheté"}
                      </button>
                      <button type="button" onClick={() => setAcquiring(null)} className="min-h-12 rounded-xl px-3 text-sm font-semibold underline underline-offset-4" style={{ color: "var(--muted)" }}>
                        Annuler
                      </button>
                      <p className="w-full text-xs" style={{ color: "var(--muted)" }}>
                        Laisse vide si tu ne sais pas : rien n&apos;est inventé.
                      </p>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <AddWishForm
        series={series}
        disabled={isPending}
        onSubmit={(fd, title, volume) => run(addWishlistItem, fd, () => setNotice({ text: `${title}, tome ${volume}, dans tes envies` }))}
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
  const [price, setPrice] = useState("");

  if (series.length === 0) {
    return (
      <p className="rounded-3xl p-5 text-center text-sm" style={{ background: "var(--surface)", color: "var(--muted)", border: "3px dashed var(--ink)" }}>
        Ajoute d&apos;abord une série à ta bibliothèque pour noter tes envies.
      </p>
    );
  }

  function pickSeries(id: string) {
    setMangaId(id);
    const s = series.find((x) => x.manga_id === id);
    setVolume(s ? String(s.nextVolume) : "");
    setPrice("");
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

  const field = "min-h-12 rounded-xl px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2";
  const fieldStyle = { background: "var(--background)", border: "2px solid var(--ink)", color: "var(--foreground)" };

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl p-5"
      style={{ background: "var(--surface)", border: "3px dashed var(--ink)" }}
      aria-labelledby="add-wish-title"
    >
      <h2 id="add-wish-title" className="mb-4 flex items-center gap-3 text-2xl sm:text-3xl" style={{ color: "var(--ink)" }}>
        <span
          aria-hidden="true"
          className="manga-sticker inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "var(--pop)", color: "var(--ink)", borderWidth: 2, boxShadow: "2px 2px 0 var(--ink)", transform: "rotate(-6deg)" }}
        >
          <AppIcon name="plus" size={20} strokeWidth={3} />
        </span>
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
          Prix indicatif (€, facultatif)
          <input
            type="text"
            inputMode="decimal"
            value={price}
            placeholder={current?.lastPrice != null ? formatPriceInput(current.lastPrice) : "7,20"}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ""))}
            className={`${field} w-28 tabular-nums`}
            style={fieldStyle}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={disabled || !volume}
        className="manga-button mt-5 min-h-14 w-full rounded-2xl px-6 text-lg font-bold disabled:opacity-50 sm:w-auto"
        style={{ background: "var(--pop)", color: "var(--ink)" }}
      >
        Ajouter à mes envies
      </button>
    </form>
  );
}
