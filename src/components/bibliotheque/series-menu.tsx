"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/app/app-icon";
import { archiveSeries, deleteSeriesPermanently, setSeriesLiked, updatePrivateSeries } from "@/app/(app)/bibliotheque/actions";

export type Runner = (action: () => Promise<{ success: boolean; error?: string }>, after: () => void) => void;

type Props = {
  open: boolean;
  onClose: () => void;
  manga: { id: string; title: string; author: string | null; total_volumes: number | null; is_private: boolean };
  onShelf: boolean;
  liked: boolean | null;
  pending: boolean;
  run: Runner;
  onNotice: (message: string) => void;
  onEditVolumes: () => void;
};

export const formOf = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

// Everything a kid rarely needs, out of the series page : one sheet.
export function SeriesMenu({ open, onClose, manga, onShelf, liked, pending, run, onNotice, onEditVolumes }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const notFor = liked === false;
  const row = "flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-base font-semibold";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={`Options pour ${manga.title}`}
      className="m-0 mt-auto w-full max-w-none rounded-t-3xl p-0 backdrop:bg-black/40 sm:m-auto sm:max-w-md sm:rounded-3xl"
      style={{ background: "var(--surface)", color: "var(--foreground)" }}
    >
      <div className="flex flex-col gap-1 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between px-2 pb-1">
          <p className="font-serif text-lg font-semibold">{manga.title}</p>
          <button type="button" onClick={onClose} aria-label="Fermer" className="flex h-11 w-11 items-center justify-center rounded-xl">
            <AppIcon name="close" size={20} />
          </button>
        </div>

        {onShelf && (
          <button
            type="button"
            className={row}
            onClick={() => {
              onEditVolumes();
              onClose();
            }}
          >
            <AppIcon name="books" size={20} /> Détails d&apos;un tome (prix, cadeau, prêt)
          </button>
        )}

        <button
          type="button"
          className={row}
          disabled={pending}
          aria-pressed={notFor}
          onClick={() =>
            run(() => setSeriesLiked(formOf({ manga_id: manga.id, liked: notFor ? "none" : "false" })), () => {
              onNotice(notFor ? "Avis retiré." : `Noté : ${manga.title} n'est pas pour toi.`);
              onClose();
            })
          }
        >
          <AppIcon name={notFor ? "check" : "close"} size={20} /> {notFor ? "Pas pour moi (annuler)" : "Pas pour moi"}
        </button>

        {onShelf && manga.is_private && <PrivateEntryForm manga={manga} pending={pending} run={run} onDone={() => onNotice("Fiche enregistrée.")} />}
        {onShelf && <RemoveOptions title={manga.title} mangaId={manga.id} pending={pending} run={run} />}
      </div>
    </dialog>
  );
}

// The reader's own entry : title, author and number of volumes, nothing
// guessed. Saved to this entry only, never to the shared catalogue.
function PrivateEntryForm({ manga, pending, run, onDone }: { manga: Props["manga"]; pending: boolean; run: Runner; onDone: () => void }) {
  const [title, setTitle] = useState(manga.title);
  const [author, setAuthor] = useState(manga.author ?? "");
  const [total, setTotal] = useState(manga.total_volumes ? String(manga.total_volumes) : "");
  const input = "min-h-11 w-full rounded-xl px-3 text-base font-normal outline-none focus:ring-2";
  const inputStyle = { background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" };
  return (
    <details className="rounded-2xl px-4">
      <summary className="flex min-h-12 cursor-pointer items-center gap-3 text-base font-semibold">Modifier ma fiche</summary>
      <form
        className="flex flex-col gap-3 pb-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => updatePrivateSeries(formOf({ manga_id: manga.id, title, author, total_volumes: total })), onDone);
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Titre
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} className={input} style={inputStyle} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Auteur (facultatif)
          <input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={200} className={input} style={inputStyle} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Nombre de tomes parus (facultatif)
          <input value={total} onChange={(e) => setTotal(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={input} style={inputStyle} />
        </label>
        <p className="text-xs" style={{ color: "var(--muted)" }}>Visible par toi seul. Rien n&apos;est ajouté au catalogue commun.</p>
        <button type="submit" disabled={pending || !title.trim()} className="min-h-11 self-start rounded-xl px-4 text-sm font-bold disabled:opacity-60" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
          Enregistrer la fiche
        </button>
      </form>
    </details>
  );
}

// Remove (reversible) or delete (not).
function RemoveOptions({ title, mangaId, pending, run }: { title: string; mangaId: string; pending: boolean; run: Runner }) {
  const router = useRouter();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [typed, setTyped] = useState("");
  const row = "flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-base font-semibold";

  return (
    <>
      {confirmArchive ? (
        <div className="flex flex-col gap-2 rounded-2xl p-4" style={{ background: "var(--surface-raised)" }}>
          <p className="text-sm">La série quitte ta collection. Tes tomes sont gardés : tu pourras la remettre.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirmArchive(false)} className="min-h-11 rounded-xl text-sm font-semibold" style={{ border: "1px solid var(--border)" }}>
              Non
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => archiveSeries(formOf({ manga_id: mangaId })), () => router.push("/bibliotheque"))}
              className="min-h-11 rounded-xl text-sm font-bold disabled:opacity-60"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              Oui, la retirer
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirmArchive(true)} className={row}>
          <AppIcon name="archive" size={20} /> Retirer de ma collection
        </button>
      )}

      {deleting ? (
        <div className="flex flex-col gap-2 rounded-2xl p-4" style={{ background: "var(--surface-raised)" }}>
          <p className="text-sm">Efface la série, ses tomes, tes lectures et tes envies. On ne peut pas revenir en arrière.</p>
          <label className="text-sm">
            Écris <strong>{title}</strong> pour confirmer
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl px-3 text-base outline-none focus:ring-2"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              autoComplete="off"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setDeleting(false); setTyped(""); }} className="min-h-11 rounded-xl text-sm font-semibold" style={{ border: "1px solid var(--border)" }}>
              Annuler
            </button>
            <button
              type="button"
              disabled={pending || typed.trim().toLowerCase() !== title.trim().toLowerCase()}
              onClick={() => run(() => deleteSeriesPermanently(formOf({ manga_id: mangaId, confirm_title: typed })), () => router.push("/bibliotheque"))}
              className="min-h-11 rounded-xl text-sm font-bold text-white disabled:opacity-40"
              style={{ background: "var(--danger)" }}
            >
              Supprimer
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setDeleting(true)} className={row} style={{ color: "var(--danger)" }}>
          <AppIcon name="trash" size={20} /> Supprimer définitivement
        </button>
      )}
    </>
  );
}
