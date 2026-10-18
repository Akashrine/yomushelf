"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AppIcon } from "@/components/app/app-icon";
import { ReadingToast } from "@/components/collection/reading-toast";
import { useReadingAction, type ReadingIntent } from "@/components/collection/use-reading-action";
import { seriesColor } from "@/lib/collection/colors";
import {
  candidateVolume,
  nextToRead,
  pickHome,
  shelfState,
  type Candidate,
  type SeriesShelf,
} from "@/lib/collection/reading";

type Props = { shelves: SeriesShelf[] };

// The reading of the moment : one volume to act on, the other volumes in
// progress, and a way to choose another one. Renders nothing for an empty
// library (the page shows its own welcome).
export function CurrentReading({ shelves }: Props) {
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const reading = useReadingAction();

  const state = shelfState(shelves);
  const pick = pickHome(shelves);
  const chosen = chosenId ? shelves.find((s) => s.manga_id === chosenId) : undefined;
  const chosenCandidate = chosen ? nextToRead(chosen) : null;
  const main = chosen && chosenCandidate ? { shelf: chosen, candidate: chosenCandidate } : pick.main;
  const alsoReading = pick.alsoReading.filter((x) => x.shelf.manga_id !== main?.shelf.manga_id);
  if (main && main.shelf !== pick.main?.shelf && pick.main?.candidate.kind === "reading") {
    alsoReading.unshift({ shelf: pick.main.shelf, volume: pick.main.candidate.volume });
  }

  function act(intent: ReadingIntent, shelf: SeriesShelf, volume: number) {
    reading.run(intent, { mangaId: shelf.manga_id, title: shelf.title, volume }, () => setChosenId(null));
  }

  if (state === "empty") return null;

  return (
    <div className="flex flex-col gap-4">
      {main ? (
        <MainCard
          shelf={main.shelf}
          candidate={main.candidate}
          pending={reading.isPending}
          onAct={act}
          alsoReading={alsoReading}
          onPick={(id) => setChosenId(id)}
          onChoose={() => setChoosing(true)}
        />
      ) : state === "no_volumes" ? (
        <EmptyState
          title="Tes séries n'ont pas encore de tomes."
          text="Indique les tomes que tu as : on te dira quoi lire ensuite."
          cta={{ href: `/bibliotheque/${shelves[0].slug}`, label: "Indiquer mes tomes" }}
        />
      ) : state === "nothing_new" ? (
        <EmptyState
          title="Tu as fini les séries que tu lis."
          text="Envie d'une nouvelle série ? Regarde ce qui pourrait te plaire."
          cta={{ href: "/decouvrir", label: "Découvrir" }}
          done
        />
      ) : (
        <EmptyState
          title="Tu as lu tous les tomes parus que tu as !"
          text="Envie d'une nouvelle série ? Regarde ce qui pourrait te plaire."
          cta={{ href: "/decouvrir", label: "Découvrir" }}
          done
        />
      )}

      {choosing && (
        <ChooseSheet
          shelves={shelves}
          onPick={(id) => {
            setChosenId(id);
            setChoosing(false);
          }}
          onClose={() => setChoosing(false)}
        />
      )}
      <ReadingToast toast={reading.toast} onClose={reading.clearToast} />
    </div>
  );
}

// ─────────────────────────────────────────

function MainCard({
  shelf,
  candidate,
  pending,
  onAct,
  alsoReading,
  onPick,
  onChoose,
}: {
  shelf: SeriesShelf;
  candidate: Candidate;
  pending: boolean;
  onAct: (intent: ReadingIntent, shelf: SeriesShelf, volume: number) => void;
  alsoReading: { shelf: SeriesShelf; volume: number }[];
  onPick: (mangaId: string) => void;
  onChoose: () => void;
}) {
  const volume = candidateVolume(candidate);
  const isReading = candidate.kind === "reading";
  const where = shelf.borrowed.includes(volume)
    ? "Emprunté"
    : shelf.owned.includes(volume)
    ? "Sur ton étagère"
    : "Pas sur ton étagère";

  return (
    <section
      aria-labelledby="main-card-label"
      className="manga-panel rise-in flex flex-col gap-4 rounded-3xl p-4 sm:p-6"
    >
      <p
        id="main-card-label"
        className="manga-sticker self-start rounded-xl px-3 py-1 font-display text-xl font-normal leading-none tracking-wide"
        style={{ background: "var(--ink)", color: "var(--pop)", transform: "rotate(-2deg)" }}
      >
        {isReading
          ? "Tu lis…"
          : candidate.kind === "skipped"
            ? "Tu as laissé de côté…"
            : candidate.kind === "to_find"
              ? "Prochain tome à trouver…"
              : "Tu peux lire…"}
      </p>

      <Link href={`/bibliotheque/${shelf.slug}`} className="flex items-center gap-4">
        <Cover shelf={shelf} volume={volume} />
        <div className="min-w-0">
          <p className="font-display text-2xl font-normal leading-none tracking-wide sm:text-3xl" style={{ color: "var(--ink)" }}>{shelf.title}</p>
          <p className="mt-1 font-display text-4xl font-normal leading-none tracking-wide sm:text-5xl" style={{ color: "var(--accent)" }}>Tome {volume}</p>
          <p className="mt-2 text-xs font-semibold" style={{ color: "var(--muted)" }}>{where}</p>
        </div>
      </Link>

      {candidate.kind === "gap" && (
        <p className="rounded-xl px-3 py-2.5 text-sm" style={{ background: "var(--pop)", color: "var(--ink)", border: "2px dashed var(--ink)" }}>
          Le <strong>tome {candidate.missing}</strong>{" "}n&apos;est pas sur ton étagère.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {candidate.kind === "gap" ? (
          <>
            <Primary onClick={() => onAct("start", shelf, candidate.available)} disabled={pending}>
              {pending ? "J'enregistre…" : `Lire le tome ${candidate.available} quand même`}
            </Primary>
            <Secondary onClick={() => onAct("finish_earlier", shelf, candidate.missing)} disabled={pending}>
              J&apos;ai lu le tome {candidate.missing} ailleurs
            </Secondary>
          </>
        ) : isReading ? (
          <Primary onClick={() => onAct("finish", shelf, volume)} disabled={pending}>
            {pending ? "J'enregistre…" : "Je l'ai fini !"}
          </Primary>
        ) : (
          <>
            <Primary onClick={() => onAct("start", shelf, volume)} disabled={pending}>
              {pending ? "J'enregistre…" : "Je commence"}
            </Primary>
            <Secondary onClick={() => onAct("finish_earlier", shelf, volume)} disabled={pending}>
              Déjà terminé ?
            </Secondary>
          </>
        )}
      </div>

      {alsoReading.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
          <span>Tu lis aussi :</span>
          {alsoReading.map((x) => (
            <button
              key={x.shelf.manga_id}
              type="button"
              onClick={() => onPick(x.shelf.manga_id)}
              className="manga-panel-sm manga-press min-h-11 rounded-full px-4 font-bold"
              style={{ background: "var(--surface)", color: "var(--ink)" }}
            >
              {x.shelf.title} {x.volume}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onChoose}
        className="min-h-11 self-center px-3 text-sm underline underline-offset-4"
        style={{ color: "var(--muted)" }}
      >
        Choisir un autre tome
      </button>
    </section>
  );
}

export function Cover({
  shelf,
  volume,
  small,
  full,
  bare,
}: {
  shelf: Pick<SeriesShelf, "manga_id" | "title" | "cover_url">;
  volume: number;
  small?: boolean;
  full?: boolean; // fills its container (series cards)
  bare?: boolean; // no volume number : the caller shows its own badge
}) {
  const size = full ? { width: "100%", height: "100%" } : small ? { width: 36, height: 50 } : { width: 84, height: 118 };
  // Ink frame like manga-panel-sm. A `full` cover fills a frame drawn by its
  // caller (a manga-panel-sm tile), so it carries no outer border of its own.
  const frame: React.CSSProperties = full
    ? {}
    : { border: "2px solid var(--ink)", boxShadow: small ? "2px 2px 0 var(--ink)" : "3px 3px 0 var(--ink)" };
  if (shelf.cover_url) {
    return (
      <span
        aria-hidden="true"
        className="relative block shrink-0 overflow-hidden rounded-lg"
        style={{ ...size, ...frame, background: `url(${shelf.cover_url}) center/cover no-repeat, var(--surface-raised)` }}
      >
        {!small && !full && (
          <span
            className="absolute bottom-1 right-1 rounded-md px-1.5 font-display text-base font-normal leading-tight tracking-wide"
            style={{ background: "var(--ink)", color: "white" }}
          >
            {volume}
          </span>
        )}
      </span>
    );
  }
  // No picture : a drawn cover with the title and the number, still readable.
  // Comic look : series colour, halftone dots, an ink spine, Bangers lettering.
  const color = seriesColor(shelf.manga_id);
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 flex-col justify-between overflow-hidden font-display font-normal tracking-wide ${full ? "rounded-xl p-3 pl-4" : "rounded-lg p-1.5 pl-2"}`}
      style={{
        ...size,
        ...frame,
        background: `radial-gradient(circle, rgba(18,21,29,0.16) 1px, transparent 1.4px) 0 0 / 8px 8px, linear-gradient(155deg, ${color} 0%, color-mix(in srgb, ${color} 84%, #12151d) 100%)`,
        color: "#12151d",
        boxShadow: `inset ${small ? 3 : full ? 6 : 5}px 0 0 #12151d${frame.boxShadow ? `, ${frame.boxShadow}` : ""}`,
      }}
    >
      {!small && <span className={`${full ? "text-base" : "text-[11px]"} uppercase leading-none`}>{shelf.title}</span>}
      {!bare && <span className={`self-end leading-none ${small ? "text-base" : full ? "text-6xl" : "text-4xl"}`}>{volume}</span>}
    </span>
  );
}


function ChooseSheet({
  shelves,
  onPick,
  onClose,
}: {
  shelves: SeriesShelf[];
  onPick: (mangaId: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
      // Keep Tab inside the sheet.
      if (e.key === "Tab" && dialogRef.current) {
        const items = dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href]");
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  const rows = [...shelves].sort((a, b) => a.title.localeCompare(b.title, "fr"));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: "rgba(18,21,29,0.6)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="manga-panel sheet-up flex max-h-[85dvh] w-full flex-col gap-4 rounded-t-3xl p-5 pb-8 sm:max-w-md sm:rounded-3xl"
      >
        <div className="mx-auto h-1.5 w-12 rounded-full sm:hidden" style={{ background: "var(--ink)" }} />
        <h2 id={titleId} className="text-3xl" style={{ color: "var(--ink)" }}>Quel tome tu veux lire ?</h2>
        <ul className="-mx-1 flex flex-col gap-3 overflow-y-auto px-1 pb-1 pr-2">
          {rows.map((shelf) => {
            const c = nextToRead(shelf);
            const volume = c ? candidateVolume(c) : null;
            return (
              <li key={shelf.manga_id}>
                <button
                  type="button"
                  disabled={!c}
                  onClick={() => onPick(shelf.manga_id)}
                  className="manga-panel-sm manga-press flex min-h-14 w-full items-center gap-3 rounded-2xl p-2 pr-3 text-left disabled:opacity-50"
                  style={{ background: "var(--surface)", color: "var(--ink)" }}
                >
                  {volume != null ? (
                    <Cover shelf={shelf} volume={volume} small />
                  ) : (
                    <span className="flex h-[50px] w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--success)", color: "white", border: "2px solid var(--ink)" }}>
                      <AppIcon name="check" size={18} strokeWidth={3} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{shelf.title}</span>
                    <span className="block text-sm" style={{ color: "var(--muted)" }}>
                      {volume != null ? `Tome ${volume}` : shelf.owned.length === 0 ? "Aucun tome chez toi" : "Tout lu pour l'instant"}
                    </span>
                  </span>
                  {c?.kind === "reading" && <Chip bg="var(--accent)" fg="white">En cours</Chip>}
                  {c?.kind === "gap" && <Chip bg="var(--pop)" fg="var(--ink)">Tome {c.missing} manquant</Chip>}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="manga-panel-sm manga-press min-h-12 rounded-2xl px-5 text-base font-bold"
            style={{ background: "var(--surface)", color: "var(--ink)" }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function Chip({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-black" style={{ color: fg, background: bg, border: "2px solid var(--ink)" }}>
      {children}
    </span>
  );
}

function Primary({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="manga-button min-h-14 flex-1 rounded-2xl px-6 text-lg font-bold disabled:opacity-60"
      style={{ background: "var(--accent)", color: "white" }}
    >
      {children}
    </button>
  );
}

function Secondary({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="manga-panel-sm manga-press min-h-12 rounded-2xl px-4 text-base font-bold disabled:opacity-60 sm:flex-1"
      style={{ background: "var(--surface)", color: "var(--ink)" }}
    >
      {children}
    </button>
  );
}

function EmptyState({
  title,
  text,
  cta,
  done,
}: {
  title: string;
  text: string;
  cta: { href: string; label: string };
  done?: boolean;
}) {
  return (
    <section className="manga-panel rounded-3xl p-8 text-center">
      <span
        className="manga-sticker inline-flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: done ? "var(--success)" : "var(--pop)", color: done ? "white" : "var(--ink)", transform: "rotate(-4deg)" }}
      >
        <AppIcon name={done ? "check" : "books"} size={30} strokeWidth={done ? 3 : 2} />
      </span>
      <p className="mt-5 font-display text-3xl font-normal leading-none tracking-wide" style={{ color: "var(--ink)" }}>{title}</p>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>{text}</p>
      <Link
        href={cta.href}
        className="manga-button mt-6 inline-flex min-h-14 items-center rounded-2xl px-6 text-lg font-bold"
        style={{ background: "var(--accent)", color: "white" }}
      >
        {cta.label}
      </Link>
    </section>
  );
}
