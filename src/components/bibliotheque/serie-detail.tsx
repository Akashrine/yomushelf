"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppIcon } from "@/components/app/app-icon";
import { VolumeSheet, type VolumeSavedEvent } from "@/components/collection/volume-sheet";
import { Celebration } from "@/components/collection/celebration";
import {
  celebrationFor,
  type CelebrationContent,
} from "@/components/collection/celebration-message";
import { formatPriceInput } from "@/components/collection/volume-fields";
import {
  addVolumeRange,
  markReadUpTo,
  updateStatus,
} from "@/app/(app)/bibliotheque/actions";
import { addWishlistItem } from "@/app/(app)/envies/actions";
import { formatEur, summarizeSeries, type OwnedVolume } from "@/lib/collection/value";

type Manga = {
  id: string;
  title: string;
  author: string | null;
  publisher_fr: string | null;
  total_volumes: number | null;
  status: "ongoing" | "completed" | "paused";
  avg_price_eur: number;
  genre_primary: string | null;
  cover_url: string | null;
  top_50_rank: number | null;
};

type Collection = {
  status: "not_started" | "reading" | "caught_up" | "completed" | "dropped";
} | null;

type Props = {
  manga: Manga;
  collection: Collection;
  volumes: OwnedVolume[];
  wishedVolumes: number[];
};

const READING_STATUS_LABELS = {
  not_started: "Non commencé",
  reading: "En cours",
  caught_up: "À jour",
  completed: "Terminé",
  dropped: "Abandonné",
} as const;

const MANGA_STATUS_LABELS = {
  ongoing: "En cours de parution",
  completed: "Terminée",
  paused: "En pause",
} as const;

export function SerieDetail({ manga, collection, volumes, wishedVolumes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openVolume, setOpenVolume] = useState<number | null>(null);
  const [celebration, setCelebration] = useState<CelebrationContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rangeFrom, setRangeFrom] = useState("1");
  const [rangeTo, setRangeTo] = useState("");
  const [rangePrice, setRangePrice] = useState("");
  const [readUpTo, setReadUpTo] = useState("");

  const byNumber = new Map(volumes.map((v) => [v.volume_number, v]));
  const summary = summarizeSeries(volumes);
  const totalVolumes = manga.total_volumes ?? 0;
  const maxOwned = volumes.length ? Math.max(...volumes.map((v) => v.volume_number)) : 0;
  const published = Math.max(totalVolumes, maxOwned);
  const gridCount = totalVolumes > 0 ? Math.max(totalVolumes, maxOwned) : Math.max(maxOwned + 1, 12);
  const readCount = summary.volumesRead;
  const unreadOwned = volumes.filter((v) => v.read_status !== "read").length;
  const next = summary.nextVolumeNumber;
  const nextIsPublished = totalVolumes === 0 || next <= totalVolumes;
  const nextPrice = summary.lastPriceEur;
  const nextWished = wishedVolumes.includes(next);

  const closeSheet = useCallback(() => setOpenVolume(null), []);
  const clearCelebration = useCallback(() => setCelebration(null), []);

  function handleSaved(event: VolumeSavedEvent) {
    setOpenVolume(null);
    setCelebration(celebrationFor(event));
    router.refresh();
  }

  function run(action: (fd: FormData) => Promise<{ success: boolean; error?: string }>, fd: FormData, after?: () => void) {
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

  function handleBulkAdd() {
    const from = parseInt(rangeFrom, 10);
    const to = parseInt(rangeTo, 10);
    if (isNaN(from) || isNaN(to) || from > to || from < 1) return;
    const fd = new FormData();
    fd.set("manga_id", manga.id);
    fd.set("from", String(from));
    fd.set("to", String(to));
    fd.set("price_eur", rangePrice);
    run(addVolumeRange, fd, () => {
      const count = to - from + 1;
      setCelebration({
        message: `${count} tome${count > 1 ? "s" : ""} ajouté${count > 1 ? "s" : ""} !`,
        sub: rangePrice ? `+${formatEur(count * Number(rangePrice.replace(",", ".")))} dans ta collection` : "Pense à noter leurs prix",
      });
      setRangeTo("");
    });
  }

  function handleReadUpTo() {
    const n = parseInt(readUpTo, 10);
    if (isNaN(n) || n < 1) return;
    const fd = new FormData();
    fd.set("manga_id", manga.id);
    fd.set("up_to", String(n));
    run(markReadUpTo, fd, () => {
      setCelebration({ message: `Lu jusqu'au tome ${n} !`, sub: "Ta pile prend des couleurs" });
      setReadUpTo("");
    });
  }

  function handleWishNext() {
    const fd = new FormData();
    fd.set("manga_id", manga.id);
    fd.set("volume_number", String(next));
    if (nextPrice != null) fd.set("target_price", formatPriceInput(nextPrice));
    run(addWishlistItem, fd, () =>
      setCelebration({ message: `Tome ${next} dans tes envies`, sub: nextPrice != null ? `Il coûte ${formatEur(nextPrice)}` : undefined })
    );
  }

  function handleStatusChange(val: string) {
    const fd = new FormData();
    fd.set("manga_id", manga.id);
    fd.set("status", val);
    run(updateStatus, fd);
  }

  const share = (n: number) => (published > 0 ? (n / published) * 100 : 0);
  const openExisting = openVolume != null ? byNumber.get(openVolume) ?? null : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Back nav */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 sm:px-6"
        style={{ background: "color-mix(in srgb, var(--background) 88%, transparent)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/bibliotheque" className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70" style={{ color: "var(--muted)" }}>
          ← Bibliothèque
        </Link>
        <Link href="/collection" className="ml-auto text-sm transition-opacity hover:opacity-70" style={{ color: "var(--muted)" }}>
          Ma collection
        </Link>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Hero */}
        <div className="mb-6 flex gap-5">
          <div
            className="shrink-0 overflow-hidden rounded-xl"
            style={{
              width: 104,
              aspectRatio: "2/3",
              background: manga.cover_url
                ? `url(${manga.cover_url}) center/cover no-repeat, #1a1010`
                : "linear-gradient(160deg,#2a1d1a 0%,#0e0b0b 100%)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
            }}
          />
          <div className="min-w-0 flex-1">
            <h1 className="mb-1 text-2xl font-bold leading-tight sm:text-3xl">{manga.title}</h1>
            {manga.author && <p className="mb-1 text-sm" style={{ color: "var(--muted)" }}>{manga.author}</p>}
            {manga.publisher_fr && <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>{manga.publisher_fr}</p>}
            <div className="flex flex-wrap gap-2">
              <Badge>{MANGA_STATUS_LABELS[manga.status]}</Badge>
              {manga.genre_primary && <Badge>{manga.genre_primary}</Badge>}
              {manga.top_50_rank && <Badge>Top {manga.top_50_rank}</Badge>}
            </div>
          </div>
        </div>

        {/* Progress : read / owned / published */}
        <section
          aria-labelledby="progress-title"
          className="mb-4 rounded-3xl p-5 sm:p-6"
          style={{ background: "radial-gradient(100% 120% at 0% 0%, rgba(255,106,61,0.12) 0%, transparent 60%), var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 id="progress-title" className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: "var(--read)" }}>
            Ma progression
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <BigCount value={readCount} label="lus" color="var(--read)" />
            <BigCount value={summary.volumesTotal} label="chez moi" color="var(--sleep)" />
            <BigCount value={totalVolumes || null} label={totalVolumes ? "parus" : "en cours"} color="var(--muted)" />
          </div>
          {published > 0 && (
            <div
              className="mt-4 flex h-4 w-full overflow-hidden rounded-full"
              style={{ background: "rgba(255,255,255,0.06)" }}
              role="img"
              aria-label={`${readCount} tomes lus, ${unreadOwned} pas encore lus, sur ${published}`}
            >
              <div className="grow-x h-full" style={{ width: `${share(readCount)}%`, background: "linear-gradient(90deg, var(--read-deep), var(--read))" }} />
              <div className="grow-x h-full" style={{ width: `${share(unreadOwned)}%`, background: "linear-gradient(90deg, var(--sleep-deep), var(--sleep))", animationDelay: "200ms" }} />
            </div>
          )}
          {totalVolumes > 0 && summary.volumesTotal < totalVolumes && (
            <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
              Il te manque {totalVolumes - summary.volumesTotal} tome{totalVolumes - summary.volumesTotal > 1 ? "s" : ""} pour la série complète.
            </p>
          )}
        </section>

        {/* Value of the series */}
        <section
          aria-labelledby="value-title"
          className="mb-6 rounded-3xl p-5 sm:p-6"
          style={{ background: "radial-gradient(100% 120% at 100% 0%, rgba(248,192,74,0.14) 0%, transparent 60%), var(--surface)", border: "1px solid rgba(248,192,74,0.2)" }}
        >
          <h2 id="value-title" className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: "var(--gold)" }}>
            Cette série vaut
          </h2>
          <p className="mt-1 text-4xl font-black tabular-nums text-gold-gradient">{formatEur(summary.valueEur)}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span>Payé <strong className="tabular-nums">{formatEur(summary.paidEur)}</strong></span>
            {summary.giftEur > 0 && (
              <span>Offert <strong className="tabular-nums" style={{ color: "var(--gold)" }}>{formatEur(summary.giftEur)}</strong></span>
            )}
            {summary.sleepingEur > 0 && (
              <span style={{ color: "var(--sleep)" }}>À lire <strong className="tabular-nums">{formatEur(summary.sleepingEur)}</strong></span>
            )}
          </div>
          {summary.missingPriceCount > 0 && (
            <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
              {summary.missingPriceCount} tome{summary.missingPriceCount > 1 ? "s" : ""} sans prix : touche-les pour l&apos;ajouter.
            </p>
          )}

          {nextIsPublished && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3" style={{ background: "var(--surface-raised)" }}>
              <p className="text-sm">
                Le tome suivant (t.{next})
                {nextPrice != null ? (
                  <> coûte <strong className="tabular-nums" style={{ color: "var(--gold)" }}>{formatEur(nextPrice)}</strong></>
                ) : (
                  " t'attend"
                )}
              </p>
              {nextWished ? (
                <Link href="/envies" className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--gold)" }}>
                  <AppIcon name="star" size={16} filled /> Dans tes envies
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleWishNext}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-transform active:scale-95 disabled:opacity-50"
                  style={{ background: "rgba(248,192,74,0.14)", color: "var(--gold)" }}
                >
                  <AppIcon name="star" size={16} /> Je le veux
                </button>
              )}
            </div>
          )}
        </section>

        {/* Volume grid */}
        <Section title="Mes tomes" hint="Touche un tome pour l'ajouter ou le modifier.">
          <div className="mb-4 grid grid-cols-6 gap-2 min-[420px]:grid-cols-8 sm:grid-cols-10">
            {Array.from({ length: gridCount }, (_, i) => i + 1).map((n) => (
              <VolumeTile
                key={n}
                number={n}
                volume={byNumber.get(n) ?? null}
                wished={wishedVolumes.includes(n)}
                onOpen={() => setOpenVolume(n)}
              />
            ))}
          </div>
          <Legend />
        </Section>

        {/* Quick actions */}
        <Section title="Aller plus vite">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>J&apos;ai lu jusqu&apos;au tome</span>
              <NumberInput value={readUpTo} onChange={setReadUpTo} placeholder={String(maxOwned || 1)} label="Numéro du dernier tome lu" />
              <button
                type="button"
                onClick={handleReadUpTo}
                disabled={isPending || !readUpTo}
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-40"
                style={{ background: "rgba(255,106,61,0.16)", color: "var(--read)" }}
              >
                <AppIcon name="check" size={16} strokeWidth={3} /> Lu
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t pt-4 text-sm" style={{ borderColor: "var(--border)" }}>
              <span>Ajouter du tome</span>
              <NumberInput value={rangeFrom} onChange={setRangeFrom} label="Premier tome" />
              <span>au</span>
              <NumberInput value={rangeTo} onChange={setRangeTo} placeholder={totalVolumes ? String(totalVolumes) : "N"} label="Dernier tome" />
              <span>à</span>
              <input
                type="text"
                inputMode="decimal"
                value={rangePrice}
                onChange={(e) => setRangePrice(e.target.value.replace(/[^\d.,]/g, ""))}
                placeholder={nextPrice != null ? formatPriceInput(nextPrice) : "7,20"}
                aria-label="Prix de chaque tome"
                className="w-20 rounded-xl px-2 py-2 text-center text-sm tabular-nums outline-none focus:ring-2"
                style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              />
              <span>€ chacun</span>
              <button
                type="button"
                onClick={handleBulkAdd}
                disabled={isPending || !rangeTo}
                className="rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-40"
                style={{ background: "var(--accent)", color: "white" }}
              >
                Ajouter
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t pt-4 text-sm" style={{ borderColor: "var(--border)" }}>
              <label htmlFor="series-status">Statut de la série</label>
              <select
                id="series-status"
                defaultValue={collection?.status ?? "not_started"}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isPending}
                className="cursor-pointer rounded-xl px-3 py-2 text-sm outline-none disabled:opacity-60"
                style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              >
                {Object.entries(READING_STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="mt-3 text-sm" role="alert" style={{ color: "var(--accent-hover)" }}>{error}</p>}
        </Section>
      </div>

      {openVolume != null && (
        <VolumeSheet
          mangaId={manga.id}
          seriesTitle={manga.title}
          volumeNumber={openVolume}
          existing={openExisting}
          suggestedPrice={nextPrice}
          onClose={closeSheet}
          onSaved={handleSaved}
        />
      )}
      {celebration && (
        <Celebration message={celebration.message} sub={celebration.sub} onDone={clearCelebration} />
      )}
    </div>
  );
}

function VolumeTile({
  number,
  volume,
  wished,
  onOpen,
}: {
  number: number;
  volume: OwnedVolume | null;
  wished: boolean;
  onOpen: () => void;
}) {
  let style: React.CSSProperties;
  let state: string;
  if (!volume) {
    state = wished ? "dans tes envies" : "pas encore chez toi";
    style = {
      background: "var(--background)",
      color: wished ? "var(--gold)" : "var(--muted)",
      border: `1.5px dashed ${wished ? "rgba(248,192,74,0.6)" : "var(--border)"}`,
    };
  } else if (volume.read_status === "read") {
    state = "lu";
    style = {
      background: "linear-gradient(160deg, #ff8a4c 0%, var(--read) 45%, var(--read-deep) 100%)",
      color: "white",
      boxShadow: "0 4px 14px rgba(255,106,61,0.3)",
    };
  } else {
    state = volume.read_status === "reading" ? "en cours de lecture" : "pas encore lu";
    style = {
      background: "linear-gradient(160deg, rgba(155,140,255,0.32) 0%, rgba(106,90,224,0.22) 100%)",
      color: "#e4dfff",
      border: "1.5px solid rgba(155,140,255,0.55)",
    };
  }

  const tag =
    volume?.acquisition_type === "gift"
      ? "var(--gift)"
      : volume?.acquisition_type === "borrowed"
      ? "var(--borrow)"
      : null;
  const origin =
    volume?.acquisition_type === "gift" ? ", offert" : volume?.acquisition_type === "borrowed" ? ", prêté" : "";
  const missingPrice = volume && volume.acquisition_type !== "borrowed" && volume.price_eur == null;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Tome ${number}, ${state}${origin}${missingPrice ? ", sans prix" : ""}`}
      className="relative flex aspect-3/4 items-center justify-center rounded-lg text-sm font-extrabold tabular-nums transition-transform active:scale-90"
      style={style}
    >
      {number}
      {tag && (
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full" style={{ background: tag, border: "2px solid var(--surface)" }} />
      )}
      {volume?.read_status === "reading" && (
        <span className="absolute bottom-1 left-1/2 h-1 w-1/2 -translate-x-1/2 rounded-full" style={{ background: "var(--gold)" }} />
      )}
      {missingPrice && (
        <span
          className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black"
          style={{ background: "var(--surface-raised)", color: "var(--gold)", border: "1px solid rgba(248,192,74,0.5)" }}
        >
          ?
        </span>
      )}
    </button>
  );
}

function Legend() {
  const items = [
    { label: "Lu", swatch: "linear-gradient(160deg, #ff8a4c, var(--read-deep))" },
    { label: "Pas encore lu", swatch: "rgba(155,140,255,0.45)" },
    { label: "Offert", dot: "var(--gift)" },
    { label: "Prêté", dot: "var(--borrow)" },
    { label: "Sans prix", text: "?" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs" style={{ color: "var(--muted)" }}>
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          {it.swatch && <span className="h-3 w-3 rounded" style={{ background: it.swatch }} />}
          {it.dot && <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.dot }} />}
          {it.text && <span className="font-black" style={{ color: "var(--gold)" }}>{it.text}</span>}
          {it.label}
        </li>
      ))}
    </ul>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
}) {
  return (
    <input
      type="number"
      min={1}
      inputMode="numeric"
      value={value}
      placeholder={placeholder}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className="w-16 rounded-xl px-2 py-2 text-center text-sm tabular-nums outline-none focus:ring-2"
      style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
    />
  );
}

function BigCount({ value, label, color }: { value: number | null; label: string; color: string }) {
  return (
    <div>
      <p className="text-3xl font-black tabular-nums sm:text-4xl" style={{ color: value == null ? "var(--muted)" : "var(--foreground)" }}>
        {value ?? "∞"}
      </p>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>{label}</p>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          {title}
        </h2>
        {hint && <p className="text-xs" style={{ color: "var(--muted)" }}>{hint}</p>}
      </div>
      <div className="rounded-3xl p-4 sm:p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {children}
      </div>
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "var(--surface-raised)", color: "var(--muted)" }}>
      {children}
    </span>
  );
}
