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
import { removeUserVolume, upsertUserVolume } from "@/app/(app)/bibliotheque/actions";
import type { AcquisitionType, ReadingStatus } from "@/lib/types/database";

export type SheetVolume = {
  volume_number: number;
  price_eur: number | null;
  acquisition_type: AcquisitionType | null;
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
  const busy = isPending || readingPending;

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
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
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
      fd.set("price_eur", value.acquisition === "borrowed" ? "" : value.price);
      fd.set("acquisition_type", value.acquisition ?? "");
      // Only a new volume asks "déjà lu ?" ; an edit never touches the reading.
      fd.set("reading", !existing && !reading && alreadyRead === "read_earlier" ? "read_earlier" : "unchanged");
      const result = await upsertUserVolume(fd);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSaved({ kind: existing ? "updated" : "added", volume: volumeNumber });
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("manga_id", mangaId);
      fd.set("volume_number", String(volumeNumber));
      const result = await removeUserVolume(fd);
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
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="sheet-up max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl p-5 pb-8 outline-none sm:max-w-md sm:rounded-3xl sm:p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full sm:hidden" style={{ background: "var(--border)" }} />
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>
              {seriesTitle}
            </p>
            <h2 id={titleId} className="text-2xl font-bold">
              Tome {volumeNumber}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{ background: "var(--surface-raised)", color: "var(--muted)" }}
          >
            <AppIcon name="close" size={18} />
          </button>
        </div>

        {/* ── Reading ───────────────────────── */}
        <section aria-label="Ta lecture" className="flex flex-col gap-2">
          {readingStatus === "read" ? (
            <>
              <p className="flex items-center gap-2 text-base font-bold">
                <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "var(--read)", color: "white" }}>
                  <AppIcon name="check" size={16} strokeWidth={3} />
                </span>
                Tu l&apos;as lu
                {reading?.finished_on && (
                  <span className="text-sm font-normal" style={{ color: "var(--muted)" }}>
                    · fini le {dateFormatter.format(new Date(reading.finished_on))}
                  </span>
                )}
              </p>
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
        <section aria-label="Chez toi" className="mt-6 border-t pt-5" style={{ borderColor: "var(--border)" }}>
          {!atHomeOpen ? (
            <div className="flex flex-col gap-2">
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
                className="min-h-12 w-full rounded-2xl py-3.5 text-base font-bold transition-transform active:scale-[0.98] disabled:opacity-60"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
              >
                {isPending ? "J'enregistre…" : existing ? "Enregistrer" : "Ajouter à mon étagère"}
              </button>

              {existing &&
                (confirmRemove ? (
                  <div className="rounded-xl p-3 text-sm" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                    <p className="font-semibold">Il n&apos;est plus chez toi ?</p>
                    <p className="mt-1" style={{ color: "var(--muted)" }}>
                      {readingStatus === "read" ? "Ta lecture reste comptée." : "Il sortira de ton étagère."}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
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
      className="min-h-12 w-full rounded-2xl py-3.5 text-base font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
      style={{
        background: "linear-gradient(135deg, var(--read) 0%, var(--read-deep) 100%)",
        boxShadow: "0 10px 30px rgba(255,106,61,0.25)",
      }}
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
      className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold disabled:opacity-60"
      style={{ background: "var(--background)", border: "1px solid var(--border)" }}
    >
      {children}
    </button>
  );
}
