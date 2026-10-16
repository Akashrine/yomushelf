"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/app/app-icon";
import { Cover } from "@/components/collection/reader-home";
import { addSeriesToLibrary } from "@/app/(app)/ajouter/actions";
import { MAX_VOLUME } from "@/lib/collection/schema";
import { hitToSeries, type FlowSeries } from "./add-flow";
import { useSeriesSearch } from "./use-series-search";

// The short way to add mangas, and the first screen of a new account :
//   1. tap covers (best sellers) or search, several at once ;
//   2. one screen : up to which volume, already read (ticked by default) ;
//   3. done.
// Gaps, dates, prices and series missing from the catalogue go through the
// detailed flow (/ajouter?detaille=1).

type Selected = { series: FlowSeries; upTo: number; read: boolean };
type Step = "pick" | "volumes" | "done";

const NETWORK_ERROR = "Impossible de confirmer l'enregistrement. Vérifie ta connexion puis réessaie.";

export function QuickAdd({ popular, welcome, name }: { popular: FlowSeries[]; welcome: boolean; name: string | null }) {
  const router = useRouter();
  const search = useSeriesSearch();
  const [step, setStep] = useState<Step>("pick");
  const [picks, setPicks] = useState<Map<string, Selected>>(new Map());
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);
  const [failed, setFailed] = useState<{ title: string; error: string }[]>([]);
  const [added, setAdded] = useState({ series: 0, volumes: 0 });
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step !== "pick") headingRef.current?.focus();
  }, [step]);

  function toggle(series: FlowSeries) {
    setPicks((current) => {
      const next = new Map(current);
      if (next.has(series.key)) next.delete(series.key);
      else next.set(series.key, { series, upTo: Math.max(1, ...series.owned), read: true });
      return next;
    });
  }

  function update(key: string, patch: Partial<Selected>) {
    setPicks((current) => {
      const p = current.get(key);
      if (!p) return current;
      return new Map(current).set(key, { ...p, ...patch });
    });
  }

  async function save() {
    const list = [...picks.values()];
    setFailed([]);
    setSaving({ done: 0, total: list.length });
    const errors: { title: string; error: string }[] = [];
    const kept = new Map<string, Selected>();
    let series = 0;
    let volumes = 0;
    // one series at a time : a failure keeps that series for a retry
    for (const [i, p] of list.entries()) {
      const result = await addSeriesToLibrary({
        series: p.series.source,
        owned: p.upTo > 0 ? { mode: "range", from: 1, to: p.upTo } : { mode: "none" },
        reading: p.read && p.upTo > 0 ? { mode: "all_owned" } : { mode: "none" },
        arrived_now: false,
        acquired_on: null,
        acquisition_type: "",
        price_eur: "",
      }).catch(() => ({ success: false as const, error: NETWORK_ERROR }));
      if (result.success) {
        series++;
        volumes += result.added_volumes;
      } else {
        errors.push({ title: p.series.title, error: result.error });
        kept.set(p.series.key, p);
      }
      setSaving({ done: i + 1, total: list.length });
    }
    setSaving(null);
    setAdded((a) => ({ series: a.series + series, volumes: a.volumes + volumes }));
    setFailed(errors);
    setPicks(kept);
    if (errors.length === 0) setStep("done");
    router.refresh();
  }

  const count = picks.size;

  if (step === "done") {
    return (
      <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 py-10 text-center" aria-labelledby="h-done">
        <span className="pop-in flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--read)", color: "white" }}>
          <AppIcon name="check" size={32} strokeWidth={3} />
        </span>
        <h1 id="h-done" ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">C&apos;est fait !</h1>
        <p style={{ color: "var(--muted)" }}>
          {added.series} série{added.series > 1 ? "s" : ""} et {added.volumes} tome{added.volumes > 1 ? "s" : ""} dans ta bibliothèque.
        </p>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Link href="/bibliotheque" className="flex min-h-12 flex-1 items-center justify-center rounded-2xl px-4 text-base font-bold text-white" style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))" }}>
            Voir ma bibliothèque
          </Link>
          <button
            type="button"
            onClick={() => {
              search.reset();
              setStep("pick");
            }}
            className="min-h-12 flex-1 rounded-2xl px-4 text-base font-semibold"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
          >
            Ajouter d&apos;autres mangas
          </button>
        </div>
      </section>
    );
  }

  if (step === "volumes") {
    return (
      <section className="mx-auto flex w-full max-w-xl flex-col gap-5 pb-24" aria-labelledby="h-volumes">
        <BackButton onClick={() => setStep("pick")} />
        <div className="flex flex-col gap-1">
          <h1 id="h-volumes" ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">Tu as quels tomes&nbsp;?</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Le dernier tome que tu as, en suivant depuis le tome 1.</p>
        </div>
        <ul className="flex flex-col gap-3">
          {[...picks.values()].map((p) => (
            <li key={p.series.key} className="flex gap-3 rounded-2xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="h-24 w-16 shrink-0">
                <Cover shelf={{ manga_id: p.series.key, title: p.series.title, cover_url: p.series.cover_url }} volume={1} full />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold leading-snug">{p.series.title}</p>
                  <button type="button" onClick={() => toggle(p.series)} aria-label={`Retirer ${p.series.title}`} className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ color: "var(--muted)" }}>
                    <AppIcon name="close" size={18} />
                  </button>
                </div>
                <VolumeStepper
                  title={p.series.title}
                  value={p.upTo}
                  max={MAX_VOLUME}
                  onChange={(upTo) => update(p.series.key, { upTo })}
                />
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm" style={{ opacity: p.upTo > 0 ? 1 : 0.5 }}>
                  <input type="checkbox" checked={p.read && p.upTo > 0} disabled={p.upTo === 0} onChange={(e) => update(p.series.key, { read: e.target.checked })} className="h-5 w-5" />
                  Je les ai lus
                </label>
              </div>
            </li>
          ))}
        </ul>
        {failed.length > 0 && (
          <div role="alert" className="rounded-2xl p-4 text-sm" style={{ background: "rgba(192,57,43,0.12)", border: "1px solid var(--accent)" }}>
            {failed.map((f) => (
              <p key={f.title}>
                <strong>{f.title}</strong> : {f.error}
              </p>
            ))}
          </div>
        )}
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Il manque des tomes au milieu, ou tu veux noter un prix&nbsp;?{" "}
          <Link href="/ajouter?detaille=1" className="font-semibold underline">Ajout détaillé</Link>
        </p>
        <BottomBar>
          <button
            type="button"
            onClick={save}
            disabled={count === 0 || saving !== null}
            className="min-h-14 w-full rounded-2xl px-4 text-lg font-bold text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))" }}
          >
            {saving ? `J'ajoute… ${saving.done}/${saving.total}` : failed.length ? "Réessayer" : "C'est fait !"}
          </button>
        </BottomBar>
      </section>
    );
  }

  const searching = search.query.trim().length >= 2;
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-24" aria-labelledby="h-pick">
      <div className="flex flex-col gap-1">
        <h1 id="h-pick" className="text-2xl font-bold sm:text-3xl">
          {welcome ? `Bienvenue${name ? ` ${name}` : ""}\u00a0! Quels mangas as-tu\u00a0?` : "Ajouter des mangas"}
        </h1>
        <p style={{ color: "var(--muted)" }}>Touche les couvertures de tes séries. Tu peux en choisir plusieurs.</p>
      </div>

      <label className="relative block">
        <span className="sr-only">Chercher un titre</span>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }}>
          <AppIcon name="search" size={20} />
        </span>
        <input
          type="search"
          value={search.query}
          onChange={(e) => search.setQuery(e.target.value)}
          placeholder="Pas dans la liste ? Écris le titre"
          autoComplete="off"
          className="min-h-14 w-full rounded-2xl pl-12 pr-4 text-lg outline-none focus:ring-2"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        />
      </label>

      {searching ? (
        <div className="flex flex-col gap-3">
          {search.waiting && <p className="text-sm" role="status" style={{ color: "var(--muted)" }}>Je cherche…</p>}
          {search.error && <p className="text-sm" role="alert" style={{ color: "var(--accent-hover)" }}>{search.error}</p>}
          {search.answered && !search.waiting && search.results.length === 0 && !search.error && (
            <p className="text-sm">
              Rien trouvé.{" "}
              <Link href="/ajouter?detaille=1" className="font-semibold underline">L&apos;ajouter quand même</Link>
            </p>
          )}
          <CoverGrid
            items={search.results.flatMap((h) => {
              const s = hitToSeries(h);
              return s ? [s] : [];
            })}
            picks={picks}
            onToggle={toggle}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Les plus lus</h2>
          <CoverGrid items={popular} picks={picks} onToggle={toggle} />
        </div>
      )}

      <BottomBar>
        <button
          type="button"
          onClick={() => setStep("volumes")}
          disabled={count === 0}
          className="min-h-14 w-full rounded-2xl px-4 text-lg font-bold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))" }}
        >
          {count === 0 ? "Choisis au moins une série" : `Continuer avec ${count} série${count > 1 ? "s" : ""}`}
        </button>
      </BottomBar>
    </section>
  );
}

function CoverGrid({ items, picks, onToggle }: { items: FlowSeries[]; picks: Map<string, Selected>; onToggle: (s: FlowSeries) => void }) {
  if (items.length === 0) return null;
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {items.map((s) => {
        const selected = picks.has(s.key);
        const onShelf = s.owned.length > 0;
        return (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => onToggle(s)}
              aria-pressed={selected}
              className="flex w-full flex-col gap-1.5 text-left transition-transform active:scale-95"
            >
              <span
                className="relative block aspect-2/3 w-full overflow-hidden rounded-xl"
                style={{ outline: selected ? "3px solid var(--read)" : "none", outlineOffset: 2 }}
              >
                <Cover shelf={{ manga_id: s.key, title: s.title, cover_url: s.cover_url }} volume={1} full />
                {selected && (
                  <span className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "var(--read)", color: "white" }}>
                    <AppIcon name="check" size={18} strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="line-clamp-2 text-sm font-semibold leading-snug">{s.title}</span>
              {onShelf && <span className="text-xs" style={{ color: "var(--muted)" }}>Déjà {s.owned.length} chez toi</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function VolumeStepper({ title, value, max, onChange }: { title: string; value: number; max: number; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.min(max, Math.max(0, v));
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(clamp(value - 1))} aria-label={`Un tome de moins pour ${title}`} className="h-12 w-12 rounded-xl text-2xl font-bold" style={{ background: "var(--surface-raised)" }}>
        −
      </button>
      <label className="flex flex-col items-center">
        <span className="text-xs" style={{ color: "var(--muted)" }}>{value === 0 ? "aucun tome" : "jusqu'au tome"}</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
          aria-label={`Dernier tome de ${title}`}
          className="h-10 w-16 rounded-lg text-center text-2xl font-extrabold tabular-nums outline-none focus:ring-2"
          style={{ background: "transparent", color: "var(--foreground)" }}
        />
      </label>
      <button type="button" onClick={() => onChange(clamp(value + 1))} aria-label={`Un tome de plus pour ${title}`} className="h-12 w-12 rounded-xl text-2xl font-bold" style={{ background: "var(--surface-raised)" }}>
        +
      </button>
    </div>
  );
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    // above the mobile tab bar (AppShell), at the very bottom from md up
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 px-4 pb-3 pt-3 md:bottom-0 md:pb-6" style={{ background: "linear-gradient(to top, var(--background) 70%, transparent)" }}>
      <div className="mx-auto max-w-xl">{children}</div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-11 w-fit items-center gap-1 text-sm font-semibold" style={{ color: "var(--muted)" }}>
      <AppIcon name="arrow-left" size={16} /> Retour
    </button>
  );
}
