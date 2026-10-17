"use client";

import Image from "next/image";
import { AppIcon } from "@/components/app/app-icon";

export type GridMode = "tomes" | "lectures" | "details";

type Props = {
  count: number;
  mode: GridMode;
  owned: Set<number>;
  read: Set<number>;
  covers: Record<number, string>;
  onTap: (volume: number) => void;
  // series without a known end : one more volume can always be shown
  onExtend?: () => void;
};

// The volumes themselves are the buttons : one tap adds or removes (Mes
// tomes) or marks read (Mes lectures). One colour per meaning, plus an
// icon so it never relies on colour alone : terracotta = chez toi,
// green = lu, dashed = pas encore.
export function VolumeGrid({ count, mode, owned, read, covers, onTap, onExtend }: Props) {
  return (
    <ul className="grid grid-cols-4 gap-2.5 min-[420px]:grid-cols-5 sm:grid-cols-7 lg:grid-cols-9">
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
        <li key={n}>
          <Tile number={n} mode={mode} atHome={owned.has(n)} isRead={read.has(n)} cover={owned.has(n) ? covers[n] : undefined} onTap={() => onTap(n)} />
        </li>
      ))}
      {onExtend && (
        <li>
          <button
            type="button"
            onClick={onExtend}
            aria-label="Afficher le tome suivant"
            className="flex w-full items-center justify-center rounded-xl transition-transform active:scale-95"
            style={{ aspectRatio: "2 / 3", border: "1.5px dashed var(--border)", color: "var(--muted)" }}
          >
            <AppIcon name="plus" size={22} />
          </button>
        </li>
      )}
    </ul>
  );
}

function Tile({
  number,
  mode,
  atHome,
  isRead,
  cover,
  onTap,
}: {
  number: number;
  mode: GridMode;
  atHome: boolean;
  isRead: boolean;
  cover?: string;
  onTap: () => void;
}) {
  const reading = mode === "lectures";
  const on = reading ? isRead : atHome;
  const label = reading
    ? `Tome ${number}, ${isRead ? "lu" : "pas encore lu"}${atHome ? "" : ", pas chez toi"}`
    : `Tome ${number}, ${atHome ? "chez toi" : "pas chez toi"}`;

  const fill = reading ? "var(--success)" : "var(--accent)";
  const style: React.CSSProperties = on
    ? { background: fill, color: "white", border: `2px solid ${fill}` }
    : reading && atHome
      ? { background: "var(--surface)", color: "var(--foreground)", border: "2px solid var(--border)" }
      : { background: "transparent", color: "var(--muted)", border: "1.5px dashed var(--border)" };

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={label}
      aria-pressed={mode === "details" ? undefined : on}
      className="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl text-xl font-bold tabular-nums transition-transform active:scale-95"
      style={{ ...style, aspectRatio: "2 / 3" }}
    >
      {cover && !reading ? (
        <>
          <Image src={cover} alt="" fill sizes="(min-width: 1024px) 100px, 25vw" className="object-cover object-top" />
          <span className="absolute inset-x-0 bottom-0 py-0.5 text-center text-sm font-bold text-white" style={{ background: "rgba(29,36,51,0.78)" }}>
            {number}
          </span>
        </>
      ) : (
        number
      )}
      {on && (
        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "white", color: fill }}>
          <AppIcon name="check" size={13} strokeWidth={3.5} />
        </span>
      )}
    </button>
  );
}
