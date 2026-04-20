"use client";

import { useState, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  toggleVolume,
  updateReadingProgress,
  updateStatus,
  addVolumeRange,
} from "@/app/(app)/bibliotheque/actions";

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
  id: string;
  owned_volumes: number[];
  last_read_volume: number | null;
  status: "not_started" | "reading" | "caught_up" | "completed" | "dropped";
  updated_at: string;
} | null;

type Props = { manga: Manga; collection: Collection };

const READING_STATUS_LABELS = {
  not_started: "Non commencé",
  reading: "En cours",
  caught_up: "À jour",
  completed: "Terminé",
  dropped: "Abandonné",
} as const;

const MANGA_STATUS_LABELS = {
  ongoing: "En cours de publication",
  completed: "Terminée",
  paused: "En pause",
} as const;

export function SerieDetail({ manga, collection }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRead, setLastRead] = useState(collection?.last_read_volume ?? 0);
  const [rangeFrom, setRangeFrom] = useState("1");
  const [rangeTo, setRangeTo] = useState("");

  const totalVolumes = manga.total_volumes ?? 0;

  type OptimisticUpdate = number | { range: number[] };
  const [optimisticOwned, addOptimistic] = useOptimistic(
    collection?.owned_volumes ?? ([] as number[]),
    (state: number[], update: OptimisticUpdate) => {
      if (typeof update === "object") {
        return [...new Set([...state, ...update.range])].sort((a, b) => a - b);
      }
      return state.includes(update)
        ? state.filter((v) => v !== update)
        : [...state, update].sort((a, b) => a - b);
    }
  );

  const ownedCount = optimisticOwned.length;
  const budget = (ownedCount * manga.avg_price_eur).toFixed(2);

  const minOwned = optimisticOwned.length > 0 ? Math.min(...optimisticOwned) : 0;
  const maxOwned = optimisticOwned.length > 0 ? Math.max(...optimisticOwned) : 0;
  const gapCount =
    optimisticOwned.length > 1
      ? maxOwned - minOwned + 1 - optimisticOwned.length
      : 0;

  function getVolumeState(vol: number): "owned" | "gap" | "not_owned" {
    if (optimisticOwned.includes(vol)) return "owned";
    if (optimisticOwned.length > 0 && vol > minOwned && vol < maxOwned)
      return "gap";
    return "not_owned";
  }

  function handleToggle(vol: number) {
    startTransition(async () => {
      addOptimistic(vol);
      const fd = new FormData();
      fd.set("manga_id", manga.id);
      fd.set("volume_number", String(vol));
      await toggleVolume(fd);
      router.refresh();
    });
  }

  function handleBulkAdd() {
    const from = parseInt(rangeFrom, 10);
    const to = parseInt(rangeTo, 10);
    if (isNaN(from) || isNaN(to) || from > to || from < 1) return;
    const range = Array.from({ length: to - from + 1 }, (_, i) => from + i);
    startTransition(async () => {
      addOptimistic({ range });
      const fd = new FormData();
      fd.set("manga_id", manga.id);
      fd.set("from", String(from));
      fd.set("to", String(to));
      await addVolumeRange(fd);
      router.refresh();
    });
  }

  function handleLastReadChange(val: number) {
    setLastRead(val);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("manga_id", manga.id);
      fd.set("last_read_volume", String(val));
      await updateReadingProgress(fd);
      router.refresh();
    });
  }

  function handleStatusChange(val: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("manga_id", manga.id);
      fd.set("status", val);
      await updateStatus(fd);
      router.refresh();
    });
  }

  const volumeCount = totalVolumes > 0 ? totalVolumes : Math.max(ownedCount, 20);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Back nav */}
      <div
        className="sticky top-0 z-10 px-4 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}
      >
        <Link
          href="/bibliotheque"
          className="text-sm flex items-center gap-1.5 transition-opacity hover:opacity-70"
          style={{ color: "var(--muted)" }}
        >
          ← Bibliothèque
        </Link>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        {/* Hero */}
        <div className="flex gap-5 mb-8">
          {/* Cover */}
          <div
            className="shrink-0 rounded-xl overflow-hidden"
            style={{
              width: 100,
              aspectRatio: "2/3",
              background: manga.cover_url
                ? `url(${manga.cover_url}) center/cover no-repeat, #1a1010`
                : "linear-gradient(160deg,#1a1010 0%,#0e0b0b 100%)",
            }}
          />

          {/* Meta */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold leading-tight mb-1">{manga.title}</h1>
            {manga.author && (
              <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>{manga.author}</p>
            )}
            {manga.publisher_fr && (
              <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>{manga.publisher_fr}</p>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              <Badge>{MANGA_STATUS_LABELS[manga.status]}</Badge>
              {manga.genre_primary && <Badge>{manga.genre_primary}</Badge>}
              {manga.top_50_rank && <Badge>Top {manga.top_50_rank}</Badge>}
            </div>

            {/* Stats row */}
            <div className="flex gap-5">
              <MiniStat label="Possédés" value={`${ownedCount}${totalVolumes ? `/${totalVolumes}` : ""} t.`} />
              <MiniStat label="Budget" value={`${budget} €`} />
            </div>
          </div>
        </div>

        {/* Status + Reading progress */}
        <Section title="Progression">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>
                Statut de lecture
              </label>
              <select
                defaultValue={collection?.status ?? "not_started"}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isPending}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer disabled:opacity-60"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {Object.entries(READING_STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>
                Dernier tome lu
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => lastRead > 0 && handleLastReadChange(lastRead - 1)}
                  disabled={isPending || lastRead === 0}
                  className="w-8 h-8 rounded-lg text-sm font-bold transition-opacity disabled:opacity-30 flex items-center justify-center"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  −
                </button>
                <span className="text-lg font-bold tabular-nums w-8 text-center">{lastRead}</span>
                <button
                  type="button"
                  onClick={() => handleLastReadChange(lastRead + 1)}
                  disabled={isPending || (totalVolumes > 0 && lastRead >= totalVolumes)}
                  className="w-8 h-8 rounded-lg text-sm font-bold transition-opacity disabled:opacity-30 flex items-center justify-center"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  +
                </button>
                {lastRead > 0 && (
                  <span className="text-xs ml-1" style={{ color: "var(--muted)" }}>
                    tome{lastRead > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* Volume grid */}
        <Section
          title={`Tomes possédés — ${ownedCount}${totalVolumes ? `/${totalVolumes}` : ""}${gapCount > 0 ? ` · ${gapCount} manquant${gapCount > 1 ? "s" : ""}` : ""}`}
        >
          <div className="flex flex-wrap gap-2 mb-4">
            {Array.from({ length: volumeCount }, (_, i) => i + 1).map((vol) => {
              const state = getVolumeState(vol);
              return (
                <button
                  key={vol}
                  type="button"
                  onClick={() => handleToggle(vol)}
                  disabled={isPending}
                  aria-pressed={state === "owned"}
                  title={state === "gap" ? `Tome ${vol} — manquant` : undefined}
                  className="w-9 h-9 rounded-lg text-xs font-semibold tabular-nums transition-all active:scale-90 disabled:opacity-60"
                  style={
                    state === "owned"
                      ? { background: "var(--accent)", color: "white", border: "none" }
                      : state === "gap"
                      ? { background: "var(--surface)", color: "var(--accent)", border: "1px dashed var(--accent)", opacity: 0.7 }
                      : { background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }
                  }
                >
                  {vol}
                </button>
              );
            })}
            {manga.status === "ongoing" && totalVolumes === 0 && (
              <button
                type="button"
                onClick={() => handleToggle(volumeCount + 1)}
                disabled={isPending}
                className="w-9 h-9 rounded-lg text-xs transition-all"
                style={{
                  background: "var(--surface)",
                  border: "1px dashed var(--border)",
                  color: "var(--muted)",
                }}
              >
                +
              </button>
            )}
          </div>

          {/* Bulk range add */}
          <div
            className="flex flex-wrap items-center gap-2 pt-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              Ajouter du tome
            </span>
            <input
              type="number"
              min={1}
              max={totalVolumes || undefined}
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              className="w-14 px-2 py-1 rounded-lg text-xs text-center tabular-nums outline-none"
              style={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              au tome
            </span>
            <input
              type="number"
              min={1}
              max={totalVolumes || undefined}
              value={rangeTo}
              placeholder={totalVolumes ? String(totalVolumes) : "N"}
              onChange={(e) => setRangeTo(e.target.value)}
              className="w-14 px-2 py-1 rounded-lg text-xs text-center tabular-nums outline-none"
              style={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
            <button
              type="button"
              onClick={handleBulkAdd}
              disabled={isPending || !rangeTo}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40"
              style={{ background: "var(--accent)", color: "white" }}
            >
              Ajouter
            </button>
          </div>
        </Section>

        {/* Budget detail */}
        <Section title="Budget">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--muted)" }}>Prix moyen / tome</span>
              <span className="font-medium">{manga.avg_price_eur.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--muted)" }}>Tomes possédés</span>
              <span className="font-medium">{ownedCount}</span>
            </div>
            <div
              className="flex justify-between text-sm font-semibold pt-2 mt-1"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <span>Total estimé</span>
              <span style={{ color: "var(--accent)" }}>{budget} €</span>
            </div>
            {totalVolumes > ownedCount && (
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                Compléter la collection : ~{((totalVolumes - ownedCount) * manga.avg_price_eur).toFixed(2)} € restants
              </p>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "var(--muted)" }}>
        {title}
      </h2>
      <div
        className="rounded-xl p-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {children}
      </div>
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
      style={{ background: "var(--surface-raised)", color: "var(--muted)" }}
    >
      {children}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-base font-bold tabular-nums">{value}</p>
    </div>
  );
}
