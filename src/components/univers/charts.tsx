"use client";

import { useState } from "react";

// Small, single-series charts for "Mon univers". One hue per chart, thin
// marks with rounded data ends on a recessive baseline, a tooltip on
// hover and keyboard focus. The drawing is decorative ; one HTML button per
// month carries the value for keyboard and screen readers.

export type BarDatum = { key: string; label: string; value: number; display: string };

export function MonthBars({
  data,
  color,
  title,
  unitLabel,
}: {
  data: BarDatum[];
  color: string;
  title: string; // used for the accessible table caption
  unitLabel: string; // header of the value column
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 0);
  const W = 600;
  const H = 150;
  const top = 26;
  const bottom = 22;
  const slot = W / data.length;
  const barW = Math.min(28, slot - 6);
  const plotH = H - top - bottom;

  if (max === 0) {
    return (
      <p className="rounded-xl px-3 py-6 text-center text-sm" style={{ background: "var(--background)", color: "var(--muted)" }}>
        Rien sur les 12 derniers mois.
      </p>
    );
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden="true" focusable="false">
        <line x1={0} x2={W} y1={H - bottom} y2={H - bottom} stroke="var(--border)" strokeWidth={1} />
        {data.map((d, i) => {
          const h = d.value === 0 ? 0 : Math.max(4, (d.value / max) * plotH);
          const x = i * slot + (slot - barW) / 2;
          const y = H - bottom - h;
          const on = active === i;
          return (
            <g key={d.key}>
              {h > 0 && (
                <path
                  d={`M${x},${H - bottom} V${y + 4} Q${x},${y} ${x + 4},${y} H${x + barW - 4} Q${x + barW},${y} ${x + barW},${y + 4} V${H - bottom} Z`}
                  fill={color}
                  opacity={active == null || on ? 1 : 0.45}
                  pointerEvents="none"
                />
              )}
              <text
                x={i * slot + slot / 2}
                y={H - 6}
                textAnchor="middle"
                fontSize={12}
                fill={on ? "var(--foreground)" : "var(--muted)"}
                fontWeight={on ? 700 : 500}
                pointerEvents="none"
              >
                {d.label}
              </text>
              {on && (
                <text x={i * slot + slot / 2} y={Math.max(14, y - 8)} textAnchor="middle" fontSize={13} fontWeight={800} fill="var(--foreground)" pointerEvents="none">
                  {d.display}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {/* Hit areas larger than the marks, one per month */}
      <div role="group" aria-label={`${title} (${unitLabel})`} className="absolute inset-0 flex">
        {data.map((d, i) => (
          <button
            key={d.key}
            type="button"
            aria-label={`${d.label} : ${d.display}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="h-full flex-1 cursor-default rounded-lg outline-none focus-visible:ring-2"
          />
        ))}
      </div>
    </div>
  );
}

export function ShareBars({
  data,
  color,
  max = 8,
}: {
  data: { key: string; label: string; share: number }[];
  color: string;
  max?: number;
}) {
  const shown = data.slice(0, max);
  const top = Math.max(...shown.map((d) => d.share), 0.0001);
  return (
    <ul className="flex flex-col gap-2.5">
      {shown.map((d) => (
        <li key={d.key} className="grid grid-cols-[minmax(6.5rem,auto)_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
          <span className="font-semibold first-letter:uppercase">{d.label}</span>
          <span className="h-3 overflow-hidden rounded-full" style={{ background: "var(--background)" }} aria-hidden="true">
            <span className="block h-full rounded-full" style={{ width: `${(d.share / top) * 100}%`, background: color }} />
          </span>
          <span className="text-right tabular-nums" style={{ color: "var(--muted)" }}>{Math.round(d.share * 100)} %</span>
        </li>
      ))}
    </ul>
  );
}
