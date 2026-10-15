"use client";

import { useEffect, useState } from "react";
import { AppIcon } from "@/components/app/app-icon";

type Props = { read: number; total: number };

const R = 52;
const CIRC = 2 * Math.PI * R;

// "J'ai lu N tomes sur M" with a ring that fills up on mount.
export function ReadProgressCard({ read, total }: Props) {
  const ratio = total > 0 ? read / total : 0;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(ratio));
    return () => cancelAnimationFrame(id);
  }, [ratio]);

  const percent = Math.round(ratio * 100);
  const left = total - read;

  return (
    <section
      aria-labelledby="read-title"
      className="relative flex h-full items-center gap-5 overflow-hidden rounded-3xl p-5 sm:flex-col sm:justify-center sm:p-7 sm:text-center"
      style={{
        background:
          "radial-gradient(100% 100% at 50% 0%, rgba(255,106,61,0.16) 0%, transparent 65%), var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="relative h-32 w-32 shrink-0 sm:h-40 sm:w-40">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
          <defs>
            <linearGradient id="ring-fire" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffb347" />
              <stop offset="55%" stopColor="#ff6a3d" />
              <stop offset="100%" stopColor="#d93a2b" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(155,140,255,0.22)" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="url(#ring-fire)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - shown)}
            style={{
              transition: "stroke-dashoffset 1400ms cubic-bezier(0.2, 0.8, 0.2, 1)",
              filter: "drop-shadow(0 0 6px rgba(255,106,61,0.55))",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black tabular-nums sm:text-4xl">{percent}%</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            lus
          </span>
        </div>
      </div>

      <div className="min-w-0">
        <p id="read-title" className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] sm:justify-center" style={{ color: "var(--read)" }}>
          <AppIcon name="book-open" size={18} />
          J&apos;ai lu
        </p>
        <p className="mt-1 text-3xl font-black tabular-nums sm:text-4xl">
          {read}
          <span className="text-lg font-bold" style={{ color: "var(--muted)" }}>
            {" "}/ {total} tomes
          </span>
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          {total === 0
            ? "Ajoute ton premier tome."
            : left === 0
            ? "Tout est lu. Bravo !"
            : `Encore ${left} à lire.`}
        </p>
      </div>
    </section>
  );
}
