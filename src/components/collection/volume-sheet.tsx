"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { AppIcon } from "@/components/app/app-icon";
import {
  AlreadyReadField,
  VolumeFields,
  formatPriceInput,
  type AlreadyReadChoice,
  type VolumeFieldsValue,
} from "@/components/collection/volume-fields";
import type { ReadingIntent } from "@/components/collection/use-reading-action";
import { removeUserVolume, setReadingDate, upsertUserVolume } from "@/app/(app)/bibliotheque/actions";
import type { AcquisitionType, ReadingStatus } from "@/lib/types/database";

export type SheetVolume = {
  volume_number: number;
  price_eur: number | null;
  acquisition_type: AcquisitionType | null;
  acquired_at?: string | null;
};

export type SheetReading = { status: ReadingStatus; finished_on: string | null } | null;

export type VolumeSavedEvent =
  | { kind: "added"; volume: number }
  | { kind: "updated"; volume: number }
  | { kind: "removed"; volume: number };

type Props = {
  mangaId: string;
  seriesTitle: string;
  volumeNumber: number;
  existing: SheetVolume | null;
  reading: SheetReading;
  suggestedPrice: number | null;
  readingPending: boolean;
  onReading: (intent: ReadingIntent) => void;
  onClose: () => void;
  onSaved: (event: VolumeSavedEvent) => void;
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

// One volume : its reading first (what a kid does most), then whether it
// is at home. Reading actions save immediately and are undone from the
// page toast; the "at home" part has its own save button.
export function VolumeSheet({
  mangaId,
  seriesTitle,
  volumeNumber,
  existing,
  reading,
  suggestedPrice,
  readingPending,
  onReading,
  onClose,
  onSaved,
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [atHomeOpen, setAtHomeOpen] = useState(existing != null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [alreadyRead, setAlreadyRead] = useState<AlreadyReadChoice>("none");
  const [value, setValue] = useState<VolumeFieldsValue>(() => ({
    price: existing?.price_eur != null ? formatPriceInput(Number(existing.price_eur)) : "",
    acquisition: existing?.acquisition_type ?? null,
  }));
  const [acquiredAt, setAcquiredAt] = useState(existing?.acquired_at ?? "");
  const [editingDate, setEditingDate] = useState(false);
  const [finishedOn, setFinishedOn] = useState(reading?.finished_on ?? "");
  const busy = isPending || readingPending;
  const today = new Date().toISOString().slice(0, 10);

  // Latest onClose without re-running the mount effect on every parent render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Escape to close, focus the dialog, lock page scroll.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    // Keep Tab inside the dialog while it is open.
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])'
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keydown", onTab);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", onTab);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("manga_id", mangaId);
      fd.set("volume_number", String(volumeNumber));
      fd.set("mode", existing ? "edit" : "add");
      fd.set("price_eur", value.acquisition === "borrowed" ? "" : value.price);
      fd.set("acquisition_type", value.acquisition ?? "");
      // Date : a known one, "unknown" to forget the one saved, or nothing.
      if (acquiredAt) fd.set("acquired_at", acquiredAt);
      else if (existing?.acquired_at) fd.set("acquired_at", "unknown");
      // Only a new volume asks "déjà lu ?" ; an edit never touches the reading.
      fd.set("reading", !existing && !reading && alreadyRead === "read_earlier" ? "read_earlier" : "unchanged");
      const result = await upsertUserVolume(fd).catch(() => ({ success: false as const, error: "Impossible de confirmer l’enregistrement. Vérifie ta connexion puis réessaie." }));
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSaved({ kind: existing ? "updated" : "added", volume: volumeNumber });
    });
  }

  function saveReadingDate() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("manga_id", mangaId);
      fd.set("volume_number", String(volumeNumber));
      fd.set("finished_on", finishedOn);
      const result = await setReadingDate(fd).catch(() => ({ success: false as const, error: "Impossible de confirmer l’enregistrement. Vérifie ta connexion puis réessaie." }));
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEditingDate(false);
      onSaved({ kind: "updated", volume: volumeNumber });
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("manga_id", mangaId);
      fd.set("volume_number", String(volumeNumber));
      const result = await removeUserVolume(fd).catch(() => ({ success: false as const, error: "Impossible de confirmer l’enregistrement. Vérifie ta connexion puis réessaie." }));
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSaved({ kind: "removed", volume: volumeNumber });
    });
  }

  const readingStatus = reading?.status ?? null;

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
        tabIndex={-1}
        className="manga-panel sheet-up max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl p-5 pb-8 outline-none sm:max-w-md sm:rounded-3xl sm:p-6"
        style={{ color: "var(--ink)" }}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full sm:hidden" style={{ background: "var(--ink)" }} />
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
              {seriesTitle}
            </p>
            <h2 id={titleId} className="mt-1 text-4xl">
              Tome {volumeNumber}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="manga-panel-sm manga-press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--surface)", color: "var(--ink)" }}
          >
            <AppIcon name="close" size={20} />
          </button>
        </div>

        {/* ── Reading ───────────────────────── */}
        <section aria-label="Ta lecture" className="flex flex-col gap-3">
          {readingStatus === "read" ? (
            <>
              <p className="flex items-center gap-2 text-base font-bold">
                <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "var(--success)", color: "white", border: "2px solid var(--ink)" }}>
                  <AppIcon name="check" size={16} strokeWidth={3} />
                </span>
                Tu l&apos;as lu
                {reading?.finished_on && (
                  <span className="text-sm font-normal" style={{ color: "var(--muted)" }}>
                    · fini le {dateFormatter.format(new Date(reading.finished_on))}
                  </span>
                )}
              </p>
              {editingDate ? (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>
                    Fini le (laisse vide si tu ne sais pas)
                    <input
                      type="date"
                      value={finishedOn}
                      max={today}
                      onChange={(e) => setFinishedOn(e.target.value)}
                      className="min-h-12 rounded-xl px-3 text-base outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      style={{ background: "var(--background)", border: "2px solid var(--ink)", color: "var(--foreground)" }}
                    />
                  </label>
                  <button type="button" onClick={saveReadingDate} disabled={busy} className="manga-panel-sm manga-press min-h-12 rounded-xl px-4 text-sm font-bold disabled:opacity-60" style={{ background: "var(--surface)" }}>
                    Enregistrer la date
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setEditingDate(true)} disabled={busy} className="min-h-11 self-start text-sm underline underline-offset-4" style={{ color: "var(--muted)" }}>
                  {reading?.finished_on ? "Corriger la date" : "Ajouter la date de fin"}
                </button>
              )}
              <SecondaryButton onClick={() => onReading("clear")} disabled={busy}>
                En fait, pas encore lu
              </SecondaryButton>
            </>
          ) : readingStatus === "reading" ? (
            <>
              <PrimaryButton onClick={() => onReading("finish")} disabled={busy}>
                {readingPending ? "J'enregistre…" : "Je l'ai fini !"}
              </PrimaryButton>
              <SecondaryButton onClick={() => onReading("clear")} disabled={busy}>
                Je ne le lis pas en fait
              </SecondaryButton>
            </>
          ) : (
            <>
              <PrimaryButton onClick={() => onReading("start")} disabled={busy}>
                {readingPending ? "J'enregistre…" : "Je commence"}
              </PrimaryButton>
              <SecondaryButton onClick={() => onReading("finish_earlier")} disabled={busy}>
                Déjà terminé ?
              </SecondaryButton>
            </>
          )}
        </section>

        {/* ── At home ───────────────────────── */}
        <section aria-label="Chez toi" className="mt-6 border-t-2 border-dashed pt-5" style={{ borderColor: "var(--ink)" }}>
          {!atHomeOpen ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Ce tome n&apos;est pas sur ton étagère.
              </p>
              <SecondaryButton onClick={() => setAtHomeOpen(true)} disabled={busy}>
                <AppIcon name="plus" size={16} /> Il est chez moi
              </SecondaryButton>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <AppIcon name="books" size={18} />
                {existing ? "Sur ton étagère" : "Ajouter à ton étagère"}
              </p>
              <VolumeFields value={value} onChange={setValue} suggestedPrice={suggestedPrice} disabled={busy} />
              <label className="flex flex-col gap-1 text-sm font-semibold">
                Arrivé le <span className="font-normal" style={{ color: "var(--muted)" }}>(facultatif, laisse vide si tu ne sais pas)</span>
                <input
                  type="date"
                  value={acquiredAt}
                  max={today}
                  onChange={(e) => setAcquiredAt(e.target.value)}
                  disabled={busy}
                  className="min-h-12 w-48 rounded-xl px-3 text-base font-normal outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  style={{ background: "var(--background)", border: "2px solid var(--ink)", color: "var(--foreground)" }}
                />
              </label>
              {!existing && !reading && (
                <AlreadyReadField value={alreadyRead} onChange={setAlreadyRead} disabled={busy} />
              )}

              {error && (
                <p className="text-center text-sm" style={{ color: "var(--accent-hover)" }} role="alert">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={busy}
                className="manga-panel-sm manga-press min-h-12 w-full rounded-2xl py-3.5 text-base font-bold disabled:opacity-60"
                style={{ background: "var(--surface-raised)", color: "var(--ink)" }}
              >
                {isPending ? "J'enregistre…" : existing ? "Enregistrer" : "Ajouter à mon étagère"}
              </button>

              {existing &&
                (confirmRemove ? (
                  <div className="rounded-2xl p-4 text-sm" style={{ background: "var(--background)", border: "2px solid var(--ink)" }}>
                    <p className="font-semibold">Il n&apos;est plus chez toi ?</p>
                    <p className="mt-1" style={{ color: "var(--muted)" }}>
                      {readingStatus === "read" ? "Ta lecture reste comptée." : "Il sortira de ton étagère."}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <SecondaryButton onClick={() => setConfirmRemove(false)} disabled={busy}>
                        Non, il est là
                      </SecondaryButton>
                      <SecondaryButton onClick={handleRemove} disabled={busy}>
                        Oui, le retirer
                      </SecondaryButton>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(true)}
                    disabled={busy}
                    className="flex min-h-11 w-full items-center justify-center gap-1.5 text-sm disabled:opacity-60"
                    style={{ color: "var(--muted)" }}
                  >
                    <AppIcon name="trash" size={16} />
                    Il n&apos;est plus chez moi
                  </button>
                ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function PrimaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="manga-button min-h-14 w-full rounded-2xl px-6 text-lg font-bold disabled:opacity-60"
      style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="manga-panel-sm manga-press flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl px-3 text-base font-semibold disabled:opacity-60"
      style={{ background: "var(--surface)", color: "var(--ink)" }}
    >
      {children}
    </button>
  );
}
