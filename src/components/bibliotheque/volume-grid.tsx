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
  fallbackCover?: string; // the series cover, for a volume at home whose own cover is not known yet
  onTap: (volume: number) => void;
  // series without a known end : one more volume can always be shown
  onExtend?: () => void;
};

// The volumes themselves are the buttons : one tap adds or removes (Mes
// tomes) or marks read (Mes lectures). One colour per meaning, plus an
// icon so it never relies on colour alone : terracotta = chez toi,
// green = lu, dashed = pas encore. Filled tiles are ink-bordered manga
// panels ; missing ones are dashed outlines on the paper.
// Dashed outline and number of a volume not there yet (6:1 on paper).
const MISSING = "#5b6170";

export function VolumeGrid({ count, mode, owned, read, covers, fallbackCover, onTap, onExtend }: Props) {
  // A volume at home without its own cover wears the series cover, muted so it is not taken for the real one.
  const standIns = mode === "lectures" || !fallbackCover ? 0 : Array.from({ length: count }, (_, i) => i + 1).filter((n) => owned.has(n) && !covers[n]).length;
  return (
    <>
      <ul className="grid grid-cols-4 gap-3 min-[420px]:grid-cols-5 sm:grid-cols-7 lg:grid-cols-9">
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
        <li key={n}>
          <Tile number={n} mode={mode} atHome={owned.has(n)} isRead={read.has(n)} cover={owned.has(n) ? covers[n] ?? fallbackCover : undefined} standIn={owned.has(n) && !covers[n]} onTap={() => onTap(n)} />
        </li>
      ))}
      {onExtend && (
        <li>
          <button
            type="button"
            onClick={onExtend}
            aria-label="Afficher le tome suivant"
            className="manga-press flex w-full items-center justify-center rounded-xl"
            style={{ aspectRatio: "2 / 3", border: `2px dashed ${MISSING}`, color: MISSING }}
          >
            <AppIcon name="plus" size={22} />
          </button>
        </li>
      )}
      </ul>
      {standIns > 0 && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Les tomes grisés montrent la couverture de la série, en attendant celle de chaque tome.
        </p>
      )}
    </>
  );
}

function Tile({
  number,
  mode,
  atHome,
  isRead,
  cover,
  standIn,
  onTap,
}: {
  number: number;
  mode: GridMode;
  atHome: boolean;
  isRead: boolean;
  cover?: string;
  standIn?: boolean;
  onTap: () => void;
}) {
  const reading = mode === "lectures";
  const on = reading ? isRead : atHome;
  const label = reading
    ? `Tome ${number}, ${isRead ? "lu" : "pas encore lu"}${atHome ? "" : ", pas chez toi"}`
    : `Tome ${number}, ${atHome ? "chez toi" : "pas chez toi"}`;

  const fill = reading ? "var(--success)" : "var(--accent)";
  // on : manga-panel-sm gives the ink border and hard shadow
  const style: React.CSSProperties = on
    ? { background: fill, color: "white" }
    : reading && atHome
      ? { background: "var(--surface)", color: "var(--ink)", border: `2px solid ${MISSING}` }
      : { background: "transparent", color: MISSING, border: `2px dashed ${MISSING}` };

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={label}
      aria-pressed={mode === "details" ? undefined : on}
      className={`manga-press relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl font-display text-3xl leading-none ${on ? "manga-panel-sm" : ""}`}
      style={{ ...style, aspectRatio: "2 / 3" }}
    >
      {cover && !reading ? (
        <>
          <Image src={cover} alt="" fill sizes="(min-width: 1024px) 100px, 25vw" className="object-cover object-top" style={standIn ? { filter: "saturate(0.35) brightness(0.92)" } : undefined} />
          <span className="absolute inset-x-0 bottom-0 py-0.5 text-center text-lg leading-tight text-white" style={{ background: "var(--ink)", borderTop: "2px solid var(--ink)" }}>
            {number}
          </span>
        </>
      ) : (
        number
      )}
      {on && (
        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "white", color: fill, border: "1.5px solid var(--ink)" }}>
          <AppIcon name="check" size={13} strokeWidth={3.5} />
        </span>
      )}
    </button>
  );
}
