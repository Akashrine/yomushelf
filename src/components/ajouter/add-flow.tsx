"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/app/app-icon";
import { Cover } from "@/components/collection/reader-home";
import { VolumeFields, type VolumeFieldsValue } from "@/components/collection/volume-fields";
import { addSeriesToLibrary, type AddSeriesInput } from "@/app/(app)/ajouter/actions";
import type { SearchHit } from "@/lib/manga-api/merge";

// The series being added, whatever its origin.
export type FlowSeries = {
  key: string; // stable React key
  title: string;
  author: string | null;
  total_volumes: number | null;
  cover_url: string | null;
  source: AddSeriesInput["series"];
  owned: number[]; // volumes already at home (series already on the shelf)
  read: number[];
};

type Step = "search" | "private" | "volumes" | "reading" | "done";
type OwnedMode = "range" | "list" | "none";
type ReadingMode = "none" | "all_owned" | "up_to";

const NETWORK_ERROR = "Impossible de confirmer l'enregistrement. Vérifie ta connexion puis réessaie.";

function hitToSeries(h: SearchHit): FlowSeries | null {
  const base = { key: h.id ?? `mal-${h.mal_id}`, title: h.title, author: h.author, total_volumes: h.total_volumes, cover_url: h.cover_url, owned: [], read: [] };
  if (h.id) return { ...base, source: { source: "db", manga_id: h.id } };
  if (h.mal_id) return { ...base, source: { source: "mal", mal_id: h.mal_id } };
  return null;
}

export function AddFlow({ initial }: { initial: FlowSeries | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initial ? "volumes" : "search");
  const [series, setSeries] = useState<FlowSeries | null>(initial);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [remoteDown, setRemoteDown] = useState(false);

  const [privTitle, setPrivTitle] = useState("");
  const [privAuthor, setPrivAuthor] = useState("");
  const [privTotal, setPrivTotal] = useState("");

  const [ownedMode, setOwnedMode] = useState<OwnedMode>("range");
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(1);
  const [startsLater, setStartsLater] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());

  const [readingMode, setReadingMode] = useState<ReadingMode | null>(null);
  const [readTo, setReadTo] = useState(1);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [arrivedNow, setArrivedNow] = useState(false);
  const [details, setDetails] = useState<VolumeFieldsValue>({ price: "", acquisition: null });

  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ manga_id: string; added_volumes: number; added_readings: number } | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the new step's title so screen readers follow along.
  useEffect(() => {
    if (step === "search") searchRef.current?.focus();
    else headingRef.current?.focus();
  }, [step]);

  // Debounced search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return; // short queries show nothing (see shownResults)
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(`/api/mangas/search?q=${encodeURIComponent(q)}&limit=12`, { signal: ctrl.signal });
        const json = (await res.json()) as { results?: SearchHit[]; remote_unavailable?: boolean; error?: string };
        if (!res.ok) throw new Error(json.error ?? "search");
        setResults(json.results ?? []);
        setRemoteDown(Boolean(json.remote_unavailable));
      } catch (e) {
        if ((e as Error).name !== "AbortError") setSearchError("La recherche ne répond pas. Vérifie ta connexion et réessaie.");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  // A query too short to search shows no stale results or error.
  const queryReady = query.trim().length >= 2;
  const shownResults = queryReady ? results : [];
  const shownError = queryReady ? searchError : null;

  const maxVolume = Math.max(series?.total_volumes ?? 0, 60, ...(series?.owned ?? []), ...(series?.read ?? []));
  const ownedPreview: number[] =
    ownedMode === "none"
      ? []
      : ownedMode === "range"
        ? Array.from({ length: Math.max(0, rangeTo - (startsLater ? rangeFrom : 1) + 1) }, (_, i) => (startsLater ? rangeFrom : 1) + i)
        : [...picked].sort((a, b) => a - b);
  const allOwned = [...new Set([...(series?.owned ?? []), ...ownedPreview])];

  function choose(s: FlowSeries) {
    setSeries(s);
    setOwnedMode("range");
    const highest = Math.max(1, ...s.owned);
    setRangeTo(highest);
    setRangeFrom(1);
    setStartsLater(false);
    setPicked(new Set(s.owned));
    setReadingMode(null);
    setReadTo(Math.max(1, ...s.read));
    setStep("volumes");
  }

  function choosePrivate() {
    const title = privTitle.trim();
    if (!title) return;
    const total = Number(privTotal) || null;
    choose({
      key: `private-${title}`,
      title,
      author: privAuthor.trim() || null,
      total_volumes: total,
      cover_url: null,
      source: { source: "private", title, author: privAuthor.trim() || null, total_volumes: total },
      owned: [],
      read: [],
    });
  }

  function save() {
    if (!series || readingMode == null) return;
    setSaveError(null);
    const input: AddSeriesInput = {
      series: series.source,
      owned:
        ownedMode === "none" || ownedPreview.length === 0
          ? { mode: "none" }
          : ownedMode === "range"
            ? { mode: "range", from: startsLater ? rangeFrom : 1, to: rangeTo }
            : { mode: "list", volumes: ownedPreview },
      reading: readingMode === "up_to" ? { mode: "up_to", to: readTo } : { mode: readingMode },
      arrived_now: arrivedNow,
      acquisition_type: details.acquisition ?? "",
      price_eur: details.acquisition === "borrowed" ? "" : details.price,
    };
    startTransition(async () => {
      const result = await addSeriesToLibrary(input).catch(() => ({ success: false as const, error: NETWORK_ERROR }));
      if (!result.success) {
        setSaveError(result.error);
        return;
      }
      setSaved(result);
      setStep("done");
      router.refresh();
    });
  }

  function restart() {
    setSeries(null);
    setQuery("");
    setResults([]);
    setSaved(null);
    setDetails({ price: "", acquisition: null });
    setArrivedNow(false);
    setDetailsOpen(false);
    setStep("search");
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      {step === "search" && (
        <section className="flex flex-col gap-4" aria-labelledby="h-search">
          <h1 id="h-search" className="text-2xl font-bold">Ajouter un manga</h1>
          <label className="relative block">
            <span className="sr-only">Titre du manga</span>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }}>
              <AppIcon name="search" size={20} />
            </span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Titre du manga, comme tu l'écris"
              autoComplete="off"
              className="min-h-14 w-full rounded-2xl pl-12 pr-4 text-lg outline-none focus:ring-2"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            />
          </label>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Pas besoin de l&apos;écrire parfaitement : « spi famili » trouve Spy x Family.</p>

          {searching && <p className="text-sm" role="status" style={{ color: "var(--muted)" }}>Je cherche…</p>}
          {shownError && <p className="text-sm" role="alert" style={{ color: "var(--accent-hover)" }}>{shownError}</p>}

          {shownResults.length > 0 && (
            <ul className="flex flex-col gap-2" aria-label="Résultats">
              {shownResults.map((h) => {
                const s = hitToSeries(h);
                if (!s) return null;
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => choose(s)}
                      className="flex w-full items-center gap-3 rounded-2xl p-2 pr-3 text-left"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    >
                      <span className="h-[72px] w-12 shrink-0">
                        <Cover shelf={{ manga_id: s.key, title: s.title, cover_url: s.cover_url }} volume={1} full />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold leading-snug">{s.title}</span>
                        <span className="block text-sm" style={{ color: "var(--muted)" }}>
                          {[h.author, h.total_volumes ? `${h.total_volumes} tomes` : null, h.source === "private" ? "ajoutée par toi" : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <AppIcon name="chevron-right" size={18} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {query.trim().length >= 2 && !searching && (
            <div className="flex flex-col gap-2 rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px dashed var(--border)" }}>
              <p className="text-sm">
                {shownResults.length === 0 ? "Rien trouvé." : "Ce n'est pas dans la liste ?"}{" "}
                {remoteDown && <span style={{ color: "var(--muted)" }}>Le catalogue en ligne ne répond pas en ce moment.</span>}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPrivTitle(query.trim());
                  setStep("private");
                }}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-bold"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
              >
                <AppIcon name="plus" size={18} /> Ajouter quand même
              </button>
            </div>
          )}
        </section>
      )}

      {step === "private" && (
        <section className="flex flex-col gap-4" aria-labelledby="h-private">
          <BackButton onClick={() => setStep("search")} />
          <h1 id="h-private" ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">Ajouter quand même</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            La série sera visible par toi seul. Tu pourras ajouter ses tomes et tes lectures comme les autres.
          </p>
          <TextField label="Titre" value={privTitle} onChange={setPrivTitle} required />
          <TextField label="Auteur (facultatif)" value={privAuthor} onChange={setPrivAuthor} />
          <TextField label="Nombre de tomes parus (facultatif)" value={privTotal} onChange={(v) => setPrivTotal(v.replace(/\D/g, ""))} inputMode="numeric" />
          <PrimaryButton onClick={choosePrivate} disabled={!privTitle.trim()}>Continuer</PrimaryButton>
        </section>
      )}

      {step === "volumes" && series && (
        <section className="flex flex-col gap-4" aria-labelledby="h-volumes">
          {!initial && <BackButton onClick={() => setStep("search")} />}
          <SeriesHeader series={series} />
          <h1 id="h-volumes" ref={headingRef} tabIndex={-1} className="text-xl font-bold outline-none">Quels tomes as-tu ?</h1>
          {series.owned.length > 0 && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Déjà chez toi : {series.owned.length} tome{series.owned.length > 1 ? "s" : ""}. Ils ne changent pas.
            </p>
          )}

          <Choice selected={ownedMode === "range"} onSelect={() => setOwnedMode("range")} title="J'ai les tomes du 1 au…" hint="Tous à la suite" />
          {ownedMode === "range" && (
            <div className="flex flex-col gap-3 rounded-2xl p-4" style={{ background: "var(--surface)" }}>
              {startsLater && <Stepper label="Du tome" value={rangeFrom} min={1} max={rangeTo} onChange={setRangeFrom} />}
              <Stepper label={startsLater ? "Au tome" : "Jusqu'au tome"} value={rangeTo} min={startsLater ? rangeFrom : 1} max={maxVolume} onChange={setRangeTo} big />
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={startsLater} onChange={(e) => setStartsLater(e.target.checked)} className="h-5 w-5" />
                Ma collection ne commence pas au tome 1
              </label>
            </div>
          )}

          <Choice selected={ownedMode === "list"} onSelect={() => setOwnedMode("list")} title="J'ai seulement certains tomes" hint="Il en manque au milieu" />
          {ownedMode === "list" && (
            <div className="rounded-2xl p-3" style={{ background: "var(--surface)" }}>
              <p className="mb-2 text-sm" style={{ color: "var(--muted)" }}>Touche les tomes que tu as.</p>
              <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8" role="group" aria-label="Tomes que tu as">
                {Array.from({ length: Math.max(series.total_volumes ?? 0, 30, ...series.owned, ...picked) }, (_, i) => i + 1).map((n) => {
                  const here = series.owned.includes(n);
                  const on = here || picked.has(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={on}
                      disabled={here}
                      aria-label={`Tome ${n}${here ? ", déjà chez toi" : ""}`}
                      onClick={() =>
                        setPicked((prev) => {
                          const next = new Set(prev);
                          if (next.has(n)) next.delete(n);
                          else next.add(n);
                          return next;
                        })
                      }
                      className="flex aspect-square min-h-10 items-center justify-center rounded-lg text-sm font-bold"
                      style={
                        on
                          ? { background: "var(--sleep)", color: "#120e2a", opacity: here ? 0.6 : 1 }
                          : { border: "1.5px dashed var(--border)", color: "var(--muted)" }
                      }
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Choice selected={ownedMode === "none"} onSelect={() => setOwnedMode("none")} title="Aucun pour l'instant" hint="Je la suis, ou je l'ai lue ailleurs" />

          <PrimaryButton
            onClick={() => {
              setReadingMode(null);
              setReadTo(Math.max(1, ...series.read, ...(ownedPreview.length ? [Math.max(...ownedPreview)] : [1])));
              setStep("reading");
            }}
            disabled={ownedMode === "list" && picked.size === series.owned.length}
          >
            {ownedMode === "none" || ownedPreview.length === 0 ? "Continuer" : `Continuer avec ${ownedPreview.length} tome${ownedPreview.length > 1 ? "s" : ""}`}
          </PrimaryButton>
        </section>
      )}

      {step === "reading" && series && (
        <section className="flex flex-col gap-4" aria-labelledby="h-reading">
          <BackButton onClick={() => setStep("volumes")} />
          <SeriesHeader series={series} />
          <h1 id="h-reading" ref={headingRef} tabIndex={-1} className="text-xl font-bold outline-none">Tu en es où ?</h1>
          <Choice selected={readingMode === "none"} onSelect={() => setReadingMode("none")} title="Pas encore commencé" />
          {allOwned.length > 0 && (
            <Choice selected={readingMode === "all_owned"} onSelect={() => setReadingMode("all_owned")} title="J'ai lu tous ceux que j'ai" />
          )}
          <Choice selected={readingMode === "up_to"} onSelect={() => setReadingMode("up_to")} title="J'ai lu jusqu'au…" hint="Même des tomes que tu n'as pas" />
          {readingMode === "up_to" && (
            <div className="rounded-2xl p-4" style={{ background: "var(--surface)" }}>
              <Stepper label="Tome" value={readTo} min={1} max={maxVolume} onChange={setReadTo} big />
            </div>
          )}

          <div className="rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <button
              type="button"
              aria-expanded={detailsOpen}
              onClick={() => setDetailsOpen((v) => !v)}
              className="flex min-h-12 w-full items-center justify-between px-4 text-left text-sm font-semibold"
            >
              Achat, cadeau, prix… <span style={{ color: "var(--muted)" }}>(facultatif)</span>
            </button>
            {detailsOpen && (
              <div className="flex flex-col gap-4 px-4 pb-4">
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={arrivedNow} onChange={(e) => setArrivedNow(e.target.checked)} className="h-5 w-5" />
                  Je viens de les avoir (date d&apos;aujourd&apos;hui)
                </label>
                <VolumeFields value={details} onChange={setDetails} disabled={isPending} />
                {ownedPreview.length > 1 && details.price && (
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Ce prix sera noté pour chacun des {ownedPreview.length} tomes.</p>
                )}
              </div>
            )}
          </div>

          {saveError && <p className="text-sm" role="alert" style={{ color: "var(--accent-hover)" }}>{saveError}</p>}
          <PrimaryButton onClick={save} disabled={readingMode == null || isPending}>
            {isPending ? "J'enregistre…" : saveError ? "Réessayer" : "Ajouter à ma bibliothèque"}
          </PrimaryButton>
        </section>
      )}

      {step === "done" && series && saved && (
        <section className="flex flex-col items-start gap-4 rounded-3xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} aria-labelledby="h-done">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(127,209,168,0.15)", color: "#7fd1a8" }}>
            <AppIcon name="check" size={26} strokeWidth={3} />
          </span>
          <h1 id="h-done" ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none" role="status">
            {series.title} est dans ta bibliothèque !
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {[
              saved.added_volumes ? `${saved.added_volumes} tome${saved.added_volumes > 1 ? "s" : ""} ajouté${saved.added_volumes > 1 ? "s" : ""}` : "Aucun nouveau tome",
              saved.added_readings ? `${saved.added_readings} lecture${saved.added_readings > 1 ? "s" : ""} notée${saved.added_readings > 1 ? "s" : ""}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Link
              href={`/bibliotheque/${saved.manga_id}`}
              className="flex min-h-12 flex-1 items-center justify-center rounded-2xl px-4 text-base font-bold text-white"
              style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))" }}
            >
              Voir la série
            </Link>
            <button type="button" onClick={restart} className="min-h-12 flex-1 rounded-2xl px-4 text-base font-semibold" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
              Ajouter un autre manga
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function SeriesHeader({ series }: { series: FlowSeries }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-[72px] w-12 shrink-0">
        <Cover shelf={{ manga_id: series.key, title: series.title, cover_url: series.cover_url }} volume={1} full />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-bold leading-snug">{series.title}</span>
        <span className="block text-sm" style={{ color: "var(--muted)" }}>
          {[series.author, series.total_volumes ? `${series.total_volumes} tomes parus` : null, series.source.source === "private" ? "ajoutée par toi" : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
    </div>
  );
}

function Choice({ selected, onSelect, title, hint }: { selected: boolean; onSelect: () => void; title: string; hint?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left"
      style={{
        background: selected ? "color-mix(in srgb, var(--read) 14%, var(--surface))" : "var(--surface)",
        border: `1.5px solid ${selected ? "var(--read)" : "var(--border)"}`,
      }}
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{ border: `2px solid ${selected ? "var(--read)" : "var(--muted)"}` }}
        aria-hidden="true"
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--read)" }} />}
      </span>
      <span>
        <span className="block text-base font-bold">{title}</span>
        {hint && <span className="block text-sm" style={{ color: "var(--muted)" }}>{hint}</span>}
      </span>
    </button>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  big,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  big?: boolean;
}) {
  const clamp = (v: number) => Math.min(Math.max(min, v), max);
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      <span className="w-full text-sm font-semibold sm:w-auto">{label}</span>
      {big && (
        <button type="button" onClick={() => onChange(clamp(value - 10))} className="h-12 min-w-12 rounded-xl px-2 text-sm font-bold" style={{ background: "var(--surface-raised)" }} aria-label="Moins 10">
          −10
        </button>
      )}
      <button type="button" onClick={() => onChange(clamp(value - 1))} className="h-12 w-12 rounded-xl text-2xl font-bold" style={{ background: "var(--surface-raised)" }} aria-label="Moins 1">
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        aria-label={label}
        className={`h-12 rounded-xl text-center font-black tabular-nums outline-none focus:ring-2 ${big ? "w-24 text-3xl" : "w-20 text-xl"}`}
        style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
      />
      <button type="button" onClick={() => onChange(clamp(value + 1))} className="h-12 w-12 rounded-xl text-2xl font-bold" style={{ background: "var(--surface-raised)" }} aria-label="Plus 1">
        +
      </button>
      {big && (
        <button type="button" onClick={() => onChange(clamp(value + 10))} className="h-12 min-w-12 rounded-xl px-2 text-sm font-bold" style={{ background: "var(--surface-raised)" }} aria-label="Plus 10">
          +10
        </button>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  inputMode?: "numeric";
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        inputMode={inputMode}
        className="min-h-12 rounded-xl px-3 text-base font-normal outline-none focus:ring-2"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
      />
    </label>
  );
}

function PrimaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-14 w-full rounded-2xl px-4 text-lg font-extrabold text-white disabled:opacity-50"
      style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))" }}
    >
      {children}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-11 items-center gap-1.5 self-start text-sm" style={{ color: "var(--muted)" }}>
      <AppIcon name="arrow-left" size={16} /> Retour
    </button>
  );
}
