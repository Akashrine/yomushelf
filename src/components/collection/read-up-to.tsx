"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markReadUpTo, undoReadUpTo } from "@/app/(app)/bibliotheque/actions";

const NETWORK_ERROR = "Impossible de confirmer l'enregistrement. Vérifie ta connexion puis réessaie.";

type Done = { manga_id: string; title: string; upTo: number; added: number[]; upgraded: number[] };

// "J'ai lu jusqu'au tome N" in one action. Says what it does (every volume
// from 1 to N becomes read, without a date), asks to confirm, and can be
// undone right after.
export function ReadUpTo({
  series,
  suggested,
  compact,
}: {
  series: { manga_id: string; title: string }[];
  suggested?: number;
  compact?: boolean; // inside a series page : no series picker
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mangaId, setMangaId] = useState(series[0]?.manga_id ?? "");
  const [upTo, setUpTo] = useState(suggested ? String(suggested) : "");
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (series.length === 0) return null;
  const n = parseInt(upTo, 10);
  const valid = !isNaN(n) && n >= 1 && n <= 500;
  const title = series.find((s) => s.manga_id === mangaId)?.title ?? "";

  function submit() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("manga_id", mangaId);
      fd.set("up_to", String(n));
      const result = await markReadUpTo(fd).catch(() => ({ success: false as const, error: NETWORK_ERROR }));
      setConfirming(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDone({ manga_id: mangaId, title, upTo: n, added: result.added, upgraded: result.upgraded });
      router.refresh();
    });
  }

  function undo() {
    if (!done) return;
    setError(null);
    startTransition(async () => {
      const result = await undoReadUpTo({ manga_id: done.manga_id, added: done.added, upgraded: done.upgraded }).catch(() => ({
        success: false as const,
        error: NETWORK_ERROR,
      }));
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDone(null);
      router.refresh();
    });
  }

  const field = "min-h-11 rounded-xl px-3 text-base outline-none focus:ring-2";
  const fieldStyle = { background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" };
  const changed = done ? done.added.length + done.upgraded.length : 0;

  return (
    <div className="flex flex-col gap-3">
      {confirming && valid ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Les tomes <strong>1 à {n}</strong>
            {compact ? "" : <> de <strong>{title}</strong></>} seront notés comme lus, sans date. Ceux déjà lus gardent leur date. Tu
            pourras annuler juste après.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
            <button type="button" onClick={() => setConfirming(false)} disabled={isPending} className="min-h-11 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
              Retour
            </button>
            <button type="button" onClick={submit} disabled={isPending} className="min-h-11 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))" }}>
              {isPending ? "J'enregistre…" : "Oui, noter"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          {!compact && (
            <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>
              Série
              <select value={mangaId} onChange={(e) => setMangaId(e.target.value)} className={field} style={fieldStyle}>
                {series.map((s) => (
                  <option key={s.manga_id} value={s.manga_id}>{s.title}</option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>
            J&apos;ai lu jusqu&apos;au tome
            <input type="number" min={1} max={500} inputMode="numeric" value={upTo} onChange={(e) => setUpTo(e.target.value)} className={`${field} w-24 tabular-nums`} style={fieldStyle} />
          </label>
          <button type="button" onClick={() => setConfirming(true)} disabled={!valid || isPending} className="min-h-11 rounded-xl px-4 text-sm font-bold disabled:opacity-40" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
            Continuer
          </button>
        </div>
      )}
      <p className="text-xs" style={{ color: "var(--muted)" }}>Marque aussi tous les tomes avant comme lus.</p>
      <div aria-live="polite">
        {done && (
          <p className="flex flex-wrap items-center gap-2 text-sm" role="status">
            <span style={{ color: "var(--read)" }}>
              {changed === 0
                ? `Les tomes 1 à ${done.upTo} étaient déjà lus.`
                : `${compact ? "" : `${done.title} : `}${changed} tome${changed > 1 ? "s" : ""} noté${changed > 1 ? "s" : ""} comme lu${changed > 1 ? "s" : ""}.`}
            </span>
            {changed > 0 && (
              <button type="button" onClick={undo} disabled={isPending} className="min-h-11 px-1 font-semibold underline underline-offset-4">
                Annuler
              </button>
            )}
          </p>
        )}
        {error && <p className="text-sm" role="alert" style={{ color: "var(--accent-hover)" }}>{error}</p>}
      </div>
    </div>
  );
}
