"use client";

import { useMemo } from "react";
import type { ReadingToastState } from "@/components/collection/use-reading-action";

// Manga palette : sticker yellow, terracotta, ink, green, night blue
const COLORS = ["#ffd23f", "#ad4b2c", "#12151d", "#2a7353", "#4f5fa3"];
const PIECES = 22;

type Props = { toast: ReadingToastState; onClose: () => void };

// Bottom toast after a reading action : what was saved + "Annuler",
// or the save error + "Réessayer". A short confetti burst for "Je l'ai fini !".
export function ReadingToast({ toast, onClose }: Props) {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => {
        const angle = (i / PIECES) * Math.PI * 2;
        const dist = 80 + ((i * 37) % 70);
        return {
          color: COLORS[i % COLORS.length],
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist - 50,
          rot: ((i * 83) % 720) - 360,
          w: 6 + (i % 3) * 2,
          h: i % 2 ? 10 : 6,
        };
      }),
    []
  );

  if (!toast) return null;

  return (
    <>
      {toast.kind === "done" && toast.celebrate && (
        <div className="pointer-events-none fixed inset-x-0 bottom-40 z-[60] flex justify-center" aria-hidden="true">
          <div className="relative">
            {pieces.map((p, i) => (
              <span
                key={i}
                className="confetti-piece absolute rounded-[2px]"
                style={
                  {
                    width: p.w,
                    height: p.h,
                    background: p.color,
                    "--dx": `${p.dx}px`,
                    "--dy": `${p.dy}px`,
                    "--rot": `${p.rot}deg`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        </div>
      )}
      <div
        className="fixed inset-x-0 z-[61] flex justify-center px-3"
        style={{ bottom: "calc(84px + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* A comic speech bubble : ink panel, tail at the bottom left */}
        <div
          className="manga-panel pop-in relative flex w-full max-w-md items-center gap-3 rounded-2xl p-3 pl-4"
          role={toast.kind === "error" ? "alert" : "status"}
          aria-live="polite"
          style={{ color: "var(--ink)" }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-2.75 left-8 h-5 w-5 rotate-45"
            style={{ background: "var(--surface)", borderRight: "3px solid var(--ink)", borderBottom: "3px solid var(--ink)" }}
          />
          <div className="min-w-0 flex-1">
            {toast.kind === "error" ? (
              <>
                <p className="font-bold" style={{ color: "var(--danger)" }}>Enregistrement non confirmé.</p>
                <p className="text-sm" style={{ color: "var(--muted)" }}>Vérifie ta connexion et réessaie.</p>
              </>
            ) : (
              <>
                <p className="text-base font-bold">{toast.message}</p>
                {toast.sub && <p className="text-sm" style={{ color: "var(--muted)" }}>{toast.sub}</p>}
              </>
            )}
          </div>
          {toast.kind === "error" ? (
            <ToastButton onClick={toast.retry}>Réessayer</ToastButton>
          ) : toast.undo ? (
            <ToastButton onClick={toast.undo}>Annuler</ToastButton>
          ) : (
            <ToastButton onClick={onClose} label="Fermer">OK</ToastButton>
          )}
        </div>
      </div>
    </>
  );
}

function ToastButton({ onClick, children, label }: { onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="manga-panel-sm manga-press min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold"
      style={{ background: "var(--surface)", color: "var(--ink)" }}
    >
      {children}
    </button>
  );
}
