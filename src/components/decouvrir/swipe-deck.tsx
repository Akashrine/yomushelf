"use client";

import { useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/app/app-icon";
import { Cover } from "@/components/collection/reader-home";
import { addWishlistItem, undoSeriesWish } from "@/app/(app)/envies/actions";
import { dismissSuggestion, restoreSuggestions } from "@/app/(app)/decouvrir/actions";
import { ageLabel } from "@/lib/discovery/suggest";
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
const COLORS = ["#ff6a3d", "#f8c04a", "#9b8cff", "#5ec8f2", "#ff8a4c"];
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

export function SwipeDeck({ deck }: { deck: DeckCard[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [done, setDone] = useState<Set<string>>(new Set()); // chosen in this visit
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

  function save(card: DeckCard, choice: Choice) {
    if (choice === "skip") return;
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
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl p-8 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-lg font-bold">Tu as tout vu pour l&apos;instant !</p>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Tes envies t&apos;attendent dans ta bibliothèque. Reviens plus tard pour d&apos;autres idées.</p>
      </div>
    );
  }

  const dx = leaving?.id === top.entry.id ? leaving.dir * 700 : drag;
  const facts = [ageLabel(top.entry), top.entry.total_volumes ? `${top.entry.total_volumes} tomes` : null].filter(Boolean).join(" · ");

  return (
    <div className="flex w-full flex-col items-center gap-3 outline-none" tabIndex={0} onKeyDown={onKeyDown} aria-label="Cartes de découverte. Flèche droite : je le veux. Flèche gauche : pas pour moi.">
      {/* card + buttons fit one phone screen, above the tab bar */}
      <div className="relative w-full max-w-[340px]" style={{ height: "clamp(300px, calc(100svh - 22rem), 460px)" }}>
        {next && (
          <div className="absolute inset-0 scale-95 rounded-3xl opacity-60" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} aria-hidden="true" />
        )}
        <article
          key={top.entry.id}
          className="absolute inset-0 flex touch-pan-y select-none flex-col overflow-hidden rounded-3xl"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
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
          <div className="relative min-h-0 flex-1">
            <Cover shelf={{ manga_id: top.entry.id, title: top.entry.title, cover_url: top.entry.cover_url }} volume={1} full />
            <Stamp show={dx > 30} side="left" color="var(--gold)" text="Je le veux !" />
            <Stamp show={dx < -30} side="right" color="var(--muted)" text="Pas pour moi" />
          </div>
          <div className="flex flex-col gap-1 p-4">
            <h3 className="text-xl font-bold leading-snug">{top.entry.title}</h3>
            <p className="text-sm font-semibold" style={{ color: "var(--read)" }}>{top.reason}</p>
            {facts && <p className="text-xs" style={{ color: "var(--muted)" }}>{facts}</p>}
          </div>
        </article>
        {burst > 0 && <Confetti key={burst} />}
      </div>

      <div className="flex w-full max-w-[340px] items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => choose("dismiss")}
          className="flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-sm font-bold"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
        >
          <AppIcon name="close" size={24} strokeWidth={2.5} /> Pas pour moi
        </button>
        <button
          type="button"
          onClick={() => choose("wish")}
          className="flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-sm font-bold"
          style={{ background: "linear-gradient(135deg, #ffd56b, var(--gold-deep))", color: "#2a1a05" }}
        >
          <AppIcon name="star" size={24} filled /> Je le veux !
        </button>
      </div>
      <button type="button" onClick={() => choose("skip")} className="min-h-11 px-4 text-sm font-semibold" style={{ color: "var(--muted)" }}>
        Je ne sais pas
      </button>

      {toast && (
        // floats above the mobile tab bar, so it is seen without scrolling
        <div role="status" className="fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-[360px] items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm shadow-lg md:bottom-6" style={{ background: toast.ok ? "var(--surface-raised)" : "#3a1512", border: `1px solid ${toast.ok ? "var(--border)" : "var(--accent)"}` }}>
          <span>{toast.text}</span>
          {toast.undo && (
            <button type="button" onClick={toast.undo} className="min-h-11 shrink-0 font-bold underline">
              Annuler
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Stamp({ show, side, color, text }: { show: boolean; side: "left" | "right"; color: string; text: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute top-5 ${side === "left" ? "left-4 -rotate-12" : "right-4 rotate-12"} rounded-xl border-4 px-3 py-1 text-lg font-black uppercase transition-opacity`}
      style={{ borderColor: color, color, background: "rgba(14,11,11,0.65)", opacity: show ? 1 : 0 }}
    >
      {text}
    </span>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2;
    const dist = 90 + ((i * 37) % 80);
    return { color: COLORS[i % COLORS.length], dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist - 60, rot: ((i * 83) % 720) - 360, w: 6 + (i % 3) * 2 };
  });
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece absolute rounded-[2px]"
          style={{ width: p.w, height: p.w * 1.6, background: p.color, "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, "--rot": `${p.rot}deg` } as React.CSSProperties}
        />
      ))}
    </span>
  );
}
