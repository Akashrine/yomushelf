"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markReadUpTo } from "@/app/(app)/bibliotheque/actions";

type Props = { series: { manga_id: string; title: string }[] };

// "Lu jusqu'au tome N" for a whole series, when setting up the collection.
// Asks for confirmation : it changes many readings at once.
export function BulkReadForm({ series }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mangaId, setMangaId] = useState(series[0]?.manga_id ?? "");
  const [upTo, setUpTo] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (series.length === 0) return null;

  const n = parseInt(upTo, 10);
  const valid = !isNaN(n) && n >= 1 && n <= 500;
  const title = series.find((s) => s.manga_id === mangaId)?.title ?? "";

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("manga_id", mangaId);
      fd.set("up_to", String(n));
      const result = await markReadUpTo(fd);
      setConfirming(false);
      if (!result.success) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      setMessage({ ok: true, text: `${title} : tomes 1 à ${n} notés comme lus.` });
      setUpTo("");
      router.refresh();
    });
  }

  const field = "min-h-11 rounded-xl px-3 text-sm outline-none focus:ring-2";
  const fieldStyle = { background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" };

  return (
    <section className="rounded-3xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} aria-labelledby="bulk-read-title">
      <h2 id="bulk-read-title" className="text-base font-bold">Saisie groupée des lectures</h2>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        Pour une série déjà lue avant d&apos;utiliser Yomushelf. Les lectures sont notées sans date.
      </p>

      {confirming && valid ? (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm">
            Noter <strong>{title}</strong>, tomes 1 à {n}, comme lus ? Les lectures déjà datées gardent leur date.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
            <button type="button" onClick={() => setConfirming(false)} disabled={isPending} className="min-h-11 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
              Annuler
            </button>
            <button type="button" onClick={submit} disabled={isPending} className="min-h-11 rounded-xl text-sm font-bold text-white" style={{ background: "var(--accent)" }}>
              {isPending ? "J'enregistre…" : "Confirmer"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>
            Série
            <select value={mangaId} onChange={(e) => setMangaId(e.target.value)} className={field} style={fieldStyle}>
              {series.map((s) => (
                <option key={s.manga_id} value={s.manga_id}>{s.title}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>
            Lu jusqu&apos;au tome
            <input type="number" min={1} max={500} inputMode="numeric" value={upTo} onChange={(e) => setUpTo(e.target.value)} className={`${field} w-24 tabular-nums`} style={fieldStyle} />
          </label>
          <button type="button" onClick={() => setConfirming(true)} disabled={!valid} className="min-h-11 rounded-xl px-4 text-sm font-bold disabled:opacity-40" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
            Continuer
          </button>
        </div>
      )}
      {message && (
        <p className="mt-3 text-sm" role={message.ok ? "status" : "alert"} style={{ color: message.ok ? "var(--read)" : "var(--accent-hover)" }}>
          {message.text}
        </p>
      )}
    </section>
  );
}
