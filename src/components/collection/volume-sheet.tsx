"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { AppIcon } from "@/components/app/app-icon";
import {
  VolumeFields,
  formatPriceInput,
  type VolumeFieldsValue,
} from "@/components/collection/volume-fields";
import { removeUserVolume, upsertUserVolume } from "@/app/(app)/bibliotheque/actions";
import type { AcquisitionType, VolumeReadStatus } from "@/lib/types/database";

export type SheetVolume = {
  volume_number: number;
  price_eur: number | null;
  acquisition_type: AcquisitionType;
  read_status: VolumeReadStatus;
};

export type VolumeSavedEvent =
  | { kind: "added"; volume: number; price: number | null; acquisition: AcquisitionType }
  | { kind: "read"; volume: number }
  | { kind: "updated"; volume: number }
  | { kind: "removed"; volume: number };

type Props = {
  mangaId: string;
  seriesTitle: string;
  volumeNumber: number;
  existing: SheetVolume | null;
  suggestedPrice: number | null;
  onClose: () => void;
  onSaved: (event: VolumeSavedEvent) => void;
};

function parsePrice(raw: string): number | null {
  const n = Number(raw.replace(",", "."));
  return raw.trim() !== "" && Number.isFinite(n) ? n : null;
}

export function VolumeSheet({
  mangaId,
  seriesTitle,
  volumeNumber,
  existing,
  suggestedPrice,
  onClose,
  onSaved,
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState<VolumeFieldsValue>(() => ({
    price:
      existing?.price_eur != null
        ? formatPriceInput(Number(existing.price_eur))
        : !existing && suggestedPrice != null
        ? formatPriceInput(suggestedPrice)
        : "",
    acquisition: existing?.acquisition_type ?? "bought",
    read: existing?.read_status ?? "unread",
  }));

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
      fd.set("acquisition_type", value.acquisition);
      fd.set("read_status", value.read);
      const result = await upsertUserVolume(fd);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (!existing) {
        onSaved({
          kind: "added",
          volume: volumeNumber,
          price: value.acquisition === "borrowed" ? null : parsePrice(value.price),
          acquisition: value.acquisition,
        });
      } else if (existing.read_status !== "read" && value.read === "read") {
        onSaved({ kind: "read", volume: volumeNumber });
      } else {
        onSaved({ kind: "updated", volume: volumeNumber });
      }
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
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "var(--surface-raised)", color: "var(--muted)" }}
          >
            <AppIcon name="close" size={18} />
          </button>
        </div>

        <VolumeFields
          value={value}
          onChange={setValue}
          suggestedPrice={suggestedPrice}
          disabled={isPending}
        />

        {error && (
          <p className="mt-4 text-center text-sm" style={{ color: "var(--accent-hover)" }} role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="mt-6 w-full rounded-2xl py-4 text-base font-bold transition-transform active:scale-[0.98] disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, var(--read) 0%, var(--read-deep) 100%)",
            color: "white",
            boxShadow: "0 10px 30px rgba(255,106,61,0.25)",
          }}
        >
          {isPending ? "Un instant…" : existing ? "Enregistrer" : "Ajouter à ma collection"}
        </button>

        {existing && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-sm disabled:opacity-60"
            style={{ color: "var(--muted)" }}
          >
            <AppIcon name="trash" size={16} />
            Retirer de ma collection
          </button>
        )}
      </div>
    </div>
  );
}
