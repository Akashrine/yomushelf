"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/app/app-icon";
import { Cover } from "@/components/collection/reader-home";
import { addWishlistItem, undoSeriesWish } from "@/app/(app)/envies/actions";
import { dismissSuggestion, restoreSuggestions } from "@/app/(app)/decouvrir/actions";
import { ageLabel } from "@/lib/discovery/suggest";
import { track } from "@/lib/analytics";
import type { DeckCard } from "@/lib/discovery/deck";

// One series at a time, simple enough for a child :
//   big "Je le veux !" → volume 1 goes to the wishes (with confetti),
//   big "Pas pour moi" → not proposed again,
//   "Je ne sais pas" → next card, nothing saved.
// Swiping the card right or left does the same as the two buttons, and the
// arrow keys too. The screen moves on at once ; if saving fails, the card
// comes back on top. The last choice can be undone.

type Choice = "wish" | "dismiss" | "skip";
type Toast = { ok: boolean; text: string; undo?: () => void };

const THRESHOLD = 90; // px of drag that commits a swipe
// Confetti in the manga palette : sticker yellow, terracotta, ink, paper, green.
const COLORS = ["var(--pop)", "var(--accent)", "var(--ink)", "var(--surface)", "var(--success)"];
const NETWORK_ERROR = "Pas enregistré. Vérifie ta connexion et réessaie.";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;
function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const form = (entries: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
};

// `demo` (landing, no account) : nothing is saved ; `renderEnd` replaces the
// last screen and receives the cards wished during the visit.
export function SwipeDeck({
  deck,
  demo = false,
  renderEnd,
}: {
  deck: DeckCard[];
  demo?: boolean;
  renderEnd?: (wished: DeckCard[]) => React.ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [done, setDone] = useState<Set<string>>(new Set()); // chosen in this visit
  const [wishedHere, setWishedHere] = useState<DeckCard[]>([]);
  const [drag, setDrag] = useState(0);
  const [leaving, setLeaving] = useState<{ id: string; dir: 1 | -1 } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [burst, setBurst] = useState(0);
  const start = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const reduced = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);

  const queue = useMemo(() => deck.filter((c) => !done.has(c.entry.id)), [deck, done]);
  const top = queue[0];
  const next = queue[1];

  // The demo on the landing counts as played to the end once empty.
  const finished = !top && done.size > 0;
  useEffect(() => {
    if (demo && finished) track("demo_completed", { wishes: wishedHere.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, finished]);

  function save(card: DeckCard, choice: Choice) {
    track(demo ? "demo_swiped" : "deck_swiped", { choice: choice === "dismiss" ? "pass" : choice });
    if (choice === "wish") setWishedHere((w) => [...w, card]);
    if (choice === "skip") return;
    if (demo) {
      if (choice === "wish") setToast({ ok: true, text: `${card.entry.title} : dans tes envies !` });
      return;
    }
    const id = card.entry.id;
    const title = card.entry.title;
    const call =
      choice === "wish"
        ? () => addWishlistItem(form({ manga_id: id, volume_number: "1" }))
        : () => dismissSuggestion(form({ manga_id: id }));
    const undoCall =
      choice === "wish" ? () => undoSeriesWish(form({ manga_id: id })) : () => restoreSuggestions(form({ manga_id: id }));
    startTransition(async () => {
      const result = await call().catch(() => ({ success: false as const, error: NETWORK_ERROR }));
      if (!result.success) {
        // put the card back on top
        setDone((d) => {
          const copy = new Set(d);
          copy.delete(id);
          return copy;
        });
        setToast({ ok: false, text: result.error ?? NETWORK_ERROR });
        return;
      }
      setToast({
        ok: true,
        text: choice === "wish" ? `${title} est dans tes envies !` : `D'accord, on ne te proposera plus ${title}.`,
        undo: () => {
          setToast(null);
          startTransition(async () => {
            const undone = await undoCall().catch(() => ({ success: false as const, error: NETWORK_ERROR }));
            if (!undone.success) {
              setToast({ ok: false, text: undone.error ?? NETWORK_ERROR });
              return;
            }
            setDone((d) => {
              const copy = new Set(d);
              copy.delete(id);
              return copy;
            });
            router.refresh();
          });
        },
      });
      router.refresh();
    });
  }

  function choose(choice: Choice) {
    if (!top || leaving) return;
    const card = top;
    setToast(null);
    if (choice === "wish") setBurst((b) => b + 1);
    const finish = () => {
      setLeaving(null);
      setDrag(0);
      setDone((d) => new Set(d).add(card.entry.id));
      save(card, choice);
    };
    if (reduced) return finish();
    setLeaving({ id: card.entry.id, dir: choice === "dismiss" ? -1 : 1 });
    window.setTimeout(finish, 220);
  }

  // Arrow keys when the deck has focus.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") choose("wish");
    else if (e.key === "ArrowLeft") choose("dismiss");
    else if (e.key === "ArrowDown") choose("skip");
  }

  if (!top) {
    if (renderEnd) return <>{renderEnd(wishedHere)}</>;
    return (
      <div className="manga-panel relative flex w-full max-w-[340px] flex-col items-center gap-3 overflow-hidden rounded-3xl p-8 text-center" style={{ color: "var(--ink)" }}>
        <span aria-hidden="true" className="manga-speedlines pointer-events-none absolute inset-0" />
        <p className="relative font-display text-3xl leading-none tracking-wide">Tu as tout vu pour l&apos;instant !</p>
        <p className="relative text-sm" style={{ color: "var(--muted)" }}>Tes envies t&apos;attendent dans ta bibliothèque. Reviens plus tard pour d&apos;autres idées.</p>
      </div>
    );
  }

  const dx = leaving?.id === top.entry.id ? leaving.dir * 700 : drag;
  const facts = [ageLabel(top.entry), top.entry.total_volumes ? `${top.entry.total_volumes} tomes` : null].filter(Boolean).join(" · ");

  return (
    <div className="flex w-full flex-col items-center gap-4 rounded-3xl outline-none focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-ink" tabIndex={0} onKeyDown={onKeyDown} aria-label="Cartes de découverte. Flèche droite : je le veux. Flèche gauche : pas pour moi.">
      {/* card + buttons fit one phone screen, above the tab bar */}
      <div className="relative w-full max-w-[340px]" style={{ height: "clamp(300px, calc(100svh - 22rem), 460px)" }}>
        {next && (
          <div className="manga-panel-sm absolute inset-0 rounded-3xl" style={{ background: "var(--surface-raised)", transform: reduced ? "scale(0.96)" : "rotate(3deg) scale(0.96)" }} aria-hidden="true" />
        )}
        <article
          key={top.entry.id}
          className="manga-panel absolute inset-0 flex touch-pan-y select-none flex-col overflow-hidden rounded-3xl"
          style={{
            color: "var(--ink)",
            transform: `translateX(${dx}px) rotate(${reduced ? 0 : dx / 18}deg)`,
            transition: dragging ? "none" : "transform 220ms cubic-bezier(0.25, 1, 0.5, 1)",
          }}
          onPointerDown={(e) => {
            start.current = e.clientX;
            setDragging(true);
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => start.current !== null && setDrag(e.clientX - start.current)}
          onPointerUp={() => {
            const d = drag;
            start.current = null;
            setDragging(false);
            if (d > THRESHOLD) choose("wish");
            else if (d < -THRESHOLD) choose("dismiss");
            else setDrag(0);
          }}
          onPointerCancel={() => {
            start.current = null;
            setDragging(false);
            setDrag(0);
          }}
        >
          <div className="relative min-h-0 flex-1" style={{ borderBottom: "3px solid var(--ink)" }}>
            <Cover shelf={{ manga_id: top.entry.id, title: top.entry.title, cover_url: top.entry.cover_url }} volume={1} full />
            <Stamp show={dx > 30} side="left" pop text="Je le veux !" />
            <Stamp show={dx < -30} side="right" text="Pas pour moi" />
          </div>
          <div className="flex flex-col gap-1 p-4">
            <h2 className="text-2xl leading-none">{top.entry.title}</h2>
            <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>{top.reason}</p>
            {facts && <p className="text-xs" style={{ color: "var(--muted)" }}>{facts}</p>}
          </div>
        </article>
        {burst > 0 && <Confetti key={burst} />}
      </div>

      <div className="flex w-full max-w-[340px] items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => choose("dismiss")}
          className="manga-panel-sm manga-press flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-base font-bold"
          style={{ background: "var(--surface)", color: "var(--ink)" }}
        >
          <AppIcon name="close" size={24} strokeWidth={2.5} /> Pas pour moi
        </button>
        <button
          type="button"
          onClick={() => choose("wish")}
          className="manga-button flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-base font-bold"
          style={{ background: "var(--pop)", color: "var(--ink)" }}
        >
          <AppIcon name="star" size={24} filled /> Je le veux !
        </button>
      </div>
      <button type="button" onClick={() => choose("skip")} className="min-h-11 px-4 text-sm font-bold underline underline-offset-4" style={{ color: "var(--ink)" }}>
        Je ne sais pas
      </button>

      {toast && (
        // floats above the mobile tab bar, so it is seen without scrolling
        <div role="status" className="manga-panel fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-[360px] items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold md:bottom-6" style={{ background: toast.ok ? "var(--surface)" : "#fbe9e6", color: "var(--ink)" }}>
          <span>{toast.text}</span>
          {toast.undo && (
            <button type="button" onClick={toast.undo} className="min-h-11 shrink-0 font-bold underline underline-offset-4" style={{ color: "var(--accent)" }}>
              Annuler
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// A sticker slapped on the cover while dragging : yellow for "yes", paper for "no".
function Stamp({ show, side, pop = false, text }: { show: boolean; side: "left" | "right"; pop?: boolean; text: string }) {
  return (
    <span
      aria-hidden="true"
      className={`manga-sticker absolute top-5 ${side === "left" ? "left-4 -rotate-12" : "right-4 rotate-12"} whitespace-nowrap rounded-xl px-3 py-1 font-display text-2xl tracking-wide transition-opacity`}
      style={{ background: pop ? "var(--pop)" : "var(--surface)", color: "var(--ink)", opacity: show ? 1 : 0 }}
    >
      {text}
    </span>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2;
    const dist = 90 + ((i * 37) % 80);
    return { color: COLORS[i % COLORS.length], dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist - 60, rot: ((i * 83) % 720) - 360, w: 8 + (i % 3) * 2 };
  });
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece absolute rounded-[2px]"
          style={{ width: p.w, height: p.w * 1.6, background: p.color, border: "1.5px solid var(--ink)", "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, "--rot": `${p.rot}deg` } as React.CSSProperties}
        />
      ))}
    </span>
  );
}
