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
  readerCounts,
  readSpines,
  shelfState,
  type Candidate,
  type SeriesShelf,
} from "@/lib/collection/reading";

type Props = { shelves: SeriesShelf[] };

const PILE_MAX = 80;

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
      className="rise-in flex flex-col gap-4 rounded-3xl p-4 sm:p-6"
      style={{
        background: "radial-gradient(120% 90% at 0% 0%, rgba(255,106,61,0.18) 0%, transparent 60%), var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <p id="main-card-label" className="text-sm font-bold uppercase tracking-[0.1em]" style={{ color: "var(--read)" }}>
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
          <p className="text-xl font-extrabold leading-tight sm:text-2xl">{shelf.title}</p>
          <p className="text-3xl font-black leading-tight sm:text-4xl">Tome {volume}</p>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{where}</p>
        </div>
      </Link>

      {candidate.kind === "gap" && (
        <p className="rounded-xl px-3 py-2.5 text-sm" style={{ background: "rgba(248,192,74,0.1)", border: "1px dashed rgba(248,192,74,0.45)" }}>
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
              className="min-h-10 rounded-full px-3 font-semibold"
              style={{ background: "var(--surface-raised)", color: "var(--foreground)", border: "1px solid var(--border)" }}
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
}: {
  shelf: Pick<SeriesShelf, "manga_id" | "title" | "cover_url">;
  volume: number;
  small?: boolean;
  full?: boolean; // fills its container (series cards)
}) {
  const size = full ? { width: "100%", height: "100%" } : small ? { width: 36, height: 50 } : { width: 84, height: 118 };
  if (shelf.cover_url) {
    return (
      <span
        aria-hidden="true"
        className="relative shrink-0 overflow-hidden rounded-lg"
        style={{ ...size, background: `url(${shelf.cover_url}) center/cover no-repeat, #1a1010`, boxShadow: "0 8px 20px rgba(0,0,0,0.45)" }}
      >
        {!small && !full && (
          <span className="absolute bottom-1 right-1 rounded-md px-1.5 text-sm font-black" style={{ background: "rgba(0,0,0,0.7)" }}>
            {volume}
          </span>
        )}
      </span>
    );
  }
  // No picture : a drawn cover with the title and the number, still readable.
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 flex-col justify-between overflow-hidden rounded-lg font-black ${full ? "rounded-xl p-3" : "p-1.5"}`}
      style={{ ...size, background: `linear-gradient(155deg, ${seriesColor(shelf.manga_id)} 0%, color-mix(in srgb, ${seriesColor(shelf.manga_id)} 72%, #1a0f0c) 100%)`, color: "#1a0f0c", boxShadow: "inset -6px 0 0 rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 20px rgba(0,0,0,0.45)" }}
    >
      {!small && <span className={`${full ? "text-sm" : "text-[10px]"} uppercase leading-tight`}>{shelf.title}</span>}
      <span className={`self-end leading-none ${small ? "text-sm" : full ? "text-5xl" : "text-3xl"}`}>{volume}</span>
    </span>
  );
}

export function ReadCount({
  volumesRead,
  waitingAtHome,
  shelves,
}: {
  volumesRead: number;
  waitingAtHome: number;
  shelves: SeriesShelf[];
}) {
  const spines = readSpines(shelves);
  const shown = spines.slice(0, PILE_MAX);
  return (
    <section
      aria-label={`${volumesRead} tomes lus`}
      className="rise-in flex flex-col gap-3 rounded-3xl p-4 sm:p-6"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", animationDelay: "120ms" }}
    >
      <p className="flex items-baseline gap-2">
        {/* key : the number pops again each time the server confirms a new reading */}
        <span key={volumesRead} className="pop-in text-5xl font-black tabular-nums leading-none">
          {volumesRead}
        </span>
        <span className="text-lg font-bold">tome{volumesRead > 1 ? "s" : ""} lu{volumesRead > 1 ? "s" : ""}</span>
      </p>

      {shown.length > 0 && (
        <div className="flex flex-wrap items-end gap-[3px] pb-1" style={{ borderBottom: "5px solid #6b4430" }} aria-hidden="true">
          {shown.map((s, i) => (
            <span
              key={`${s.manga_id}-${s.volume}`}
              className="spine-drop block w-[6px] rounded-[2px]"
              style={{ height: 30 + ((i * 7) % 12), background: seriesColor(s.manga_id), animationDelay: `${Math.min(i * 12, 600)}ms` }}
            />
          ))}
          {spines.length > PILE_MAX && (
            <span className="ml-1 text-xs font-bold" style={{ color: "var(--muted)" }}>+{spines.length - PILE_MAX}</span>
          )}
        </div>
      )}

      <p className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
        <span style={{ color: "var(--sleep)" }}><AppIcon name="books" size={18} /></span>
        {waitingAtHome > 0 ? (
          <span>
            <strong style={{ color: "var(--foreground)" }}>{waitingAtHome}</strong> tome{waitingAtHome > 1 ? "s" : ""} à lire chez toi
          </span>
        ) : (
          <span>Rien à lire en attente chez toi</span>
        )}
      </p>
    </section>
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
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="sheet-up flex max-h-[85dvh] w-full flex-col gap-3 rounded-t-3xl p-5 pb-8 sm:max-w-md sm:rounded-3xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="mx-auto h-1 w-10 rounded-full sm:hidden" style={{ background: "var(--border)" }} />
        <h2 id={titleId} className="text-xl font-bold">Quel tome tu veux lire ?</h2>
        <ul className="-mx-1 flex flex-col gap-2 overflow-y-auto px-1">
          {rows.map((shelf) => {
            const c = nextToRead(shelf);
            const volume = c ? candidateVolume(c) : null;
            return (
              <li key={shelf.manga_id}>
                <button
                  type="button"
                  disabled={!c}
                  onClick={() => onPick(shelf.manga_id)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-2xl p-2 pr-3 text-left disabled:opacity-50"
                  style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
                >
                  {volume != null ? (
                    <Cover shelf={shelf} volume={volume} small />
                  ) : (
                    <span className="flex h-[50px] w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--background)", color: "var(--read)" }}>
                      <AppIcon name="check" size={18} strokeWidth={3} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{shelf.title}</span>
                    <span className="block text-sm" style={{ color: "var(--muted)" }}>
                      {volume != null ? `Tome ${volume}` : shelf.owned.length === 0 ? "Aucun tome chez toi" : "Tout lu pour l'instant"}
                    </span>
                  </span>
                  {c?.kind === "reading" && <Chip color="var(--read)">En cours</Chip>}
                  {c?.kind === "gap" && <Chip color="var(--gold)">Tome {c.missing} manquant</Chip>}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between gap-2">
          <Link href="/bibliotheque" className="min-h-11 content-center text-sm underline underline-offset-4" style={{ color: "var(--muted)" }}>
            Voir mes séries
          </Link>
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl px-4 text-sm font-semibold" style={{ background: "var(--surface-raised)" }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}>
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
      className="min-h-14 flex-1 rounded-2xl px-4 text-lg font-extrabold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
      style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))", boxShadow: "0 10px 30px rgba(255,106,61,0.25)" }}
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
      className="min-h-12 rounded-2xl px-4 text-sm font-semibold disabled:opacity-60 sm:flex-1"
      style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
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
    <section className="rounded-3xl p-8 text-center" style={{ background: "var(--surface)", border: "1px dashed var(--border)" }}>
      <span
        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: done ? "rgba(127,209,168,0.15)" : "rgba(255,106,61,0.14)", color: done ? "#7fd1a8" : "var(--read)" }}
      >
        <AppIcon name={done ? "check" : "books"} size={28} strokeWidth={done ? 3 : 2} />
      </span>
      <p className="mt-4 text-xl font-bold">{title}</p>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{text}</p>
      <Link
        href={cta.href}
        className="mt-6 inline-flex min-h-12 items-center rounded-2xl px-5 text-sm font-bold text-white"
        style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))" }}
      >
        {cta.label}
      </Link>
    </section>
  );
}
