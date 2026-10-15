"use client";

import { useState } from "react";
import { AppIcon } from "@/components/app/app-icon";
import { formatEur, formatMonth, formatMonthShort, type TimelineMonth } from "@/lib/collection/value";
import { spineColor, spineJitter } from "@/lib/collection/colors";

type Props = { months: TimelineMonth[] };

// Approximate pile height, only used to decide whether spines get a gap.
const PILE_PX = 230;

export function BookTowerChart({ months }: Props) {
  const [selected, setSelected] = useState(months.length - 1);

  if (months.length === 0) {
    return (
      <div
        className="rounded-3xl p-6 text-center"
        style={{ background: "var(--surface)", border: "1px dashed var(--border)" }}
      >
        <p className="text-base font-semibold">Le graphique apparaîtra ici.</p>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Il faut des tomes avec un prix et une date d&apos;arrivée.
        </p>
      </div>
    );
  }

  const max = Math.max(...months.map((m) => m.totalEur), 1);
  const current = months[selected] ?? months[months.length - 1];
  const first = months[0];
  const last = months[months.length - 1];
  const growth = last.totalEur - first.totalEur + first.addedEur;

  return (
    <section
      aria-labelledby="tower-title"
      className="relative overflow-hidden rounded-3xl p-5 sm:p-7"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 0%, rgba(155,140,255,0.10) 0%, transparent 60%), radial-gradient(90% 60% at 50% 100%, rgba(255,106,61,0.12) 0%, transparent 70%), var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Title */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="tower-title" className="text-xl font-bold sm:text-2xl">
            Valeur mois par mois
          </h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Chaque trait est un tome. Plus son prix est élevé, plus il est épais.
          </p>
        </div>
        {growth > 0 && months.length > 1 && (
          <p
            className="rounded-full px-3 py-1 text-sm font-bold"
            style={{ background: "rgba(248,192,74,0.12)", color: "var(--gold)" }}
          >
            +{formatEur(growth, { round: true })} depuis {formatMonth(first.key)}
          </p>
        )}
      </div>

      {/* Selected month callout */}
      <div
        key={current.key}
        className="rise-in mt-5 rounded-2xl px-4 py-3"
        style={{ background: "var(--surface-raised)" }}
        aria-live="polite"
      >
        <p className="text-sm sm:text-base">
          Fin {formatMonth(current.key, true)}, les prix saisis totalisaient{" "}
          <strong className="text-gold-gradient text-lg font-extrabold tabular-nums">
            {formatEur(current.totalEur)}
          </strong>
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-sm font-semibold">
          <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: "rgba(255,106,61,0.14)", color: "var(--read)" }}>
            <AppIcon name="check" size={14} strokeWidth={3} />
            Lus : {formatEur(current.readEur)}
          </span>
          <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: "rgba(155,140,255,0.14)", color: "var(--sleep)" }}>
            <AppIcon name="moon" size={14} filled />
            À lire : {formatEur(current.unreadEur)}
          </span>
          <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: "var(--background)", color: "var(--muted)" }}>
            {current.addedCount > 0
              ? `+${current.addedCount} tome${current.addedCount > 1 ? "s" : ""} ce mois-ci`
              : "Aucun tome ajouté ce mois-ci"}
          </span>
        </div>
      </div>

      {/* The piles */}
      <div className="mt-6" aria-hidden="true">
        <div className="flex h-[260px] items-end gap-1 sm:h-[300px] sm:gap-2">
          {months.map((m, mi) => {
            const isSelected = mi === selected;
            const pileShare = m.totalEur / max;
            const gap = (PILE_PX * pileShare) / Math.max(m.spines.length, 1) >= 6;
            const stepMs = Math.min(14, 520 / Math.max(m.spines.length, 1));
            return (
              <button
                key={m.key}
                type="button"
                tabIndex={-1}
                onClick={() => setSelected(mi)}
                className="group relative flex h-full flex-1 flex-col items-center justify-end"
              >
                {isSelected && (
                  <span
                    className="pop-in absolute z-10 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-extrabold tabular-nums sm:text-xs"
                    style={{
                      bottom: `calc(${pileShare * 88}% + 8px)`,
                      background: "var(--gold)",
                      color: "#2a1a05",
                      boxShadow: "0 4px 14px rgba(248,192,74,0.35)",
                    }}
                  >
                    {formatEur(m.totalEur, { round: true })}
                  </span>
                )}
                <div
                  className="flex w-full flex-col-reverse transition-[filter,opacity] duration-300"
                  style={{
                    height: `${pileShare * 88}%`,
                    gap: gap ? 1.5 : 0,
                    opacity: isSelected ? 1 : 0.78,
                    filter: isSelected ? "drop-shadow(0 0 14px rgba(255,140,80,0.35))" : "none",
                  }}
                >
                  {m.spines.map((s, si) => {
                    const j = spineJitter(s.manga_id, s.volume_number);
                    return (
                      <span
                        key={`${s.manga_id}-${s.volume_number}`}
                        className="spine-drop relative block rounded-[3px]"
                        style={{
                          flexGrow: s.price_eur,
                          flexBasis: 0,
                          minHeight: 1,
                          width: `${76 + j * 20}%`,
                          marginLeft: `${(j - 0.5) * 10 + (100 - 76 - j * 20) / 2}%`,
                          background: `linear-gradient(90deg, ${spineColor(s.manga_id, s.read)} 0%, ${spineColor(s.manga_id, s.read)} 70%, rgba(0,0,0,0.25) 100%)`,
                          boxShadow: s.read
                            ? "inset 0 1px 0 rgba(255,255,255,0.25)"
                            : "inset 0 1px 0 rgba(255,255,255,0.18)",
                          animationDelay: `${mi * 70 + si * stepMs}ms`,
                        }}
                      />
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>

        {/* Shelf */}
        <div
          className="relative h-3 rounded-md"
          style={{
            background: "linear-gradient(180deg, #8a5a3c 0%, #5e3a26 55%, #3c2418 100%)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,220,180,0.25)",
          }}
        />

        {/* Month labels */}
        <div className="mt-2 flex gap-1 sm:gap-2">
          {months.map((m, mi) => (
            <button
              key={m.key}
              type="button"
              tabIndex={-1}
              onClick={() => setSelected(mi)}
              className="flex-1 overflow-hidden text-center text-[10px] sm:text-xs"
              style={{
                color: mi === selected ? "var(--foreground)" : "var(--muted)",
                fontWeight: mi === selected ? 700 : 500,
              }}
            >
              {formatMonthShort(m.key)}
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard + screen reader access : one button per month */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold sm:text-sm">
          <span className="flex items-center gap-2">
            <span className="h-3 w-5 rounded-sm" style={{ background: "linear-gradient(90deg, var(--read), var(--read-deep))" }} />
            Lus
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-5 rounded-sm" style={{ background: "linear-gradient(90deg, var(--sleep), var(--sleep-deep))" }} />
            Pas encore lus
          </span>
        </div>
        <label className="sr-only" htmlFor="tower-month">
          Choisir un mois
        </label>
        <select
          id="tower-month"
          value={selected}
          onChange={(e) => setSelected(Number(e.target.value))}
          className="sr-only focus:not-sr-only focus:rounded-lg focus:px-2 focus:py-1 focus:text-sm"
          style={{ background: "var(--surface-raised)", color: "var(--foreground)" }}
        >
          {months.map((m, mi) => (
            <option key={m.key} value={mi}>
              {formatMonth(m.key, true)} : {formatEur(m.totalEur)}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
