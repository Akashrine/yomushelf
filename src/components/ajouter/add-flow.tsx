"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/app/app-icon";
import { Cover } from "@/components/collection/reader-home";
import { VolumeFields, type VolumeFieldsValue } from "@/components/collection/volume-fields";
import { addSeriesToLibrary, type AddSeriesInput } from "@/app/(app)/ajouter/actions";
import type { SearchHit } from "@/lib/manga-api/merge";
import { volumeCeiling } from "@/lib/collection/schema";
import { useSeriesSearch } from "./use-series-search";


// The series being added, whatever its origin.
export type FlowSeries = {
  key: string; // stable React key
  title: string;
  author: string | null;
  total_volumes: number | null;
  status?: "ongoing" | "completed" | "paused";
  cover_url: string | null;
  source: AddSeriesInput["series"];
  owned: number[]; // volumes already at home (series already on the shelf)
  read: number[];
};

type Step = "search" | "private" | "volumes" | "reading" | "done";
type OwnedMode = "range" | "list" | "none";
type ReadingMode = "none" | "all_owned" | "up_to";

const NETWORK_ERROR = "Impossible de confirmer l'enregistrement. Vérifie ta connexion puis réessaie.";

export function hitToSeries(h: SearchHit): FlowSeries | null {
  const base = {
    key: h.id ?? `mal-${h.mal_id}`,
    title: h.title,
    author: h.author,
    total_volumes: h.total_volumes,
    status: h.status,
    cover_url: h.cover_url,
    owned: h.owned ?? [],
    read: h.read ?? [],
  };
  if (h.id) return { ...base, source: { source: "db", manga_id: h.id } };
  if (h.mal_id) return { ...base, source: { source: "mal", mal_id: h.mal_id } };
  return null;
}

export function AddFlow({ initial }: { initial: FlowSeries | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initial ? "volumes" : "search");
  const [series, setSeries] = useState<FlowSeries | null>(initial);
  const search = useSeriesSearch();
  const { query, setQuery, answered, remoteDown, restricted } = search;

  const [privTitle, setPrivTitle] = useState("");
  const [privAuthor, setPrivAuthor] = useState("");
  const [privTotal, setPrivTotal] = useState("");

  const [ownedMode, setOwnedMode] = useState<OwnedMode>("range");
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeToTyped, setRangeTo] = useState(1);
  const [startsLater, setStartsLater] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [extraTiles, setExtraTiles] = useState(0);

  const [readingMode, setReadingMode] = useState<ReadingMode | null>(null);
  const [readToTyped, setReadTo] = useState(1);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [when, setWhen] = useState<"unknown" | "today" | "date">("unknown");
  const [acquiredOn, setAcquiredOn] = useState("");
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

  const shownResults = search.results;
  const shownError = search.error;
  const waiting = search.waiting;

  // Catalogue totals lag behind ongoing series : only a finished series is capped at its total.
  const maxVolume = volumeCeiling(series?.total_volumes, series?.status);
  // Switching to a finished series : numbers typed for another one come back under its total.
  const rangeTo = Math.min(rangeToTyped, maxVolume);
  const readTo = Math.min(readToTyped, maxVolume);
  const gridSize = Math.min(
    maxVolume,
    Math.max(series?.total_volumes ?? 0, 30, ...(series?.owned ?? []), ...picked) + extraTiles
  );
  // A series can run past its catalogue total : warn, never block.
  const highestOwned = ownedMode === "range" ? rangeTo : ownedMode === "list" ? Math.max(0, ...picked) : 0;
  const pastTotal = series?.total_volumes != null && highestOwned > series.total_volumes;
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
    setExtraTiles(0);
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
      arrived_now: when === "today",
      acquired_on: when === "date" && acquiredOn ? acquiredOn : null,
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
    search.reset();
    setSaved(null);
    setDetails({ price: "", acquisition: null });
    setWhen("unknown");
    setAcquiredOn("");
    setDetailsOpen(false);
    setStep("search");
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      {step === "search" && (
        <section className="flex flex-col gap-4" aria-labelledby="h-search">
          <h1 id="h-search" className="text-4xl sm:text-5xl" style={{ color: "var(--ink)" }}>Ajouter un manga</h1>
          <label className="relative block">
            <span className="sr-only">Titre du manga</span>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--ink)" }}>
              <AppIcon name="search" size={20} />
            </span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Titre du manga, comme tu l'écris"
              autoComplete="off"
              className="manga-panel-sm min-h-14 w-full rounded-2xl pl-12 pr-4 text-lg focus:outline-3 focus:outline-offset-2 focus:outline-[var(--accent)]"
              style={{ background: "var(--surface)", color: "var(--foreground)" }}
            />
          </label>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Pas besoin de l&apos;écrire parfaitement : « spi famili » trouve Spy x Family.</p>

          {waiting && <p className="text-sm" role="status" style={{ color: "var(--muted)" }}>Je cherche…</p>}
          {shownError && <p className="text-sm" role="alert" style={{ color: "var(--danger)" }}>{shownError}</p>}

          {shownResults.length > 0 && (
            <ul className="flex flex-col gap-3" aria-label="Résultats">
              {shownResults.map((h) => {
                const s = hitToSeries(h);
                if (!s) return null;
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => choose(s)}
                      className="manga-panel-sm manga-press flex w-full items-center gap-3 rounded-2xl p-2 pr-3 text-left"
                      style={{ background: "var(--surface)", color: "var(--ink)" }}
                    >
                      <span className="h-[72px] w-12 shrink-0 overflow-hidden rounded-lg" style={{ border: "2px solid var(--ink)" }}>
                        <Cover shelf={{ manga_id: s.key, title: s.title, cover_url: s.cover_url }} volume={1} full />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-display block text-xl leading-tight">{s.title}</span>
                        <span className="block text-sm" style={{ color: "var(--muted)" }}>
                          {[h.author, h.total_volumes ? `${h.total_volumes} tomes` : null, h.source === "private" ? "ajoutée par toi" : null, h.owned?.length ? `${h.owned.length} chez toi` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <AppIcon name="chevron-right" size={20} strokeWidth={2.5} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {answered && !waiting && (
            <div className="flex flex-col gap-3 rounded-2xl p-4" style={{ background: "var(--surface)", border: "2px dashed var(--ink)" }}>
              <p className="text-sm">
                {shownResults.length === 0 ? "Rien trouvé." : "Ce n'est pas dans la liste ?"}{" "}
                {remoteDown && <span style={{ color: "var(--muted)" }}>Le catalogue en ligne ne répond pas en ce moment.</span>}
                {restricted && <span style={{ color: "var(--muted)" }}>Sur ton compte, la recherche ne montre que les séries avec un âge conseillé.</span>}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPrivTitle(query.trim());
                  setStep("private");
                }}
                className="manga-panel-sm manga-press flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-base font-bold"
                style={{ background: "var(--pop)", color: "var(--ink)" }}
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
          <h1 id="h-private" ref={headingRef} tabIndex={-1} className="text-4xl outline-none sm:text-5xl" style={{ color: "var(--ink)" }}>Ajouter quand même</h1>
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
          <BackButton onClick={() => setStep("search")} />
          <SeriesHeader series={series} />
          <h1 id="h-volumes" ref={headingRef} tabIndex={-1} className="text-3xl outline-none sm:text-4xl" style={{ color: "var(--ink)" }}>Quels tomes as-tu ?</h1>
          {series.owned.length > 0 && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Déjà chez toi : {series.owned.length} tome{series.owned.length > 1 ? "s" : ""}. Ils ne changent pas.
            </p>
          )}

          <Choice name="owned" selected={ownedMode === "range"} onSelect={() => setOwnedMode("range")} title="J'ai les tomes du 1 au…" hint="Tous à la suite" />
          {ownedMode === "range" && (
            <div className="manga-panel flex flex-col gap-3 rounded-2xl p-4">
              {startsLater && <Stepper label="Du tome" value={rangeFrom} min={1} max={rangeTo} onChange={setRangeFrom} />}
              <Stepper label={startsLater ? "Au tome" : "Jusqu'au tome"} value={rangeTo} min={startsLater ? rangeFrom : 1} max={maxVolume} onChange={setRangeTo} big />
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={startsLater} onChange={(e) => setStartsLater(e.target.checked)} className="h-5 w-5" style={{ accentColor: "var(--accent)" }} />
                Ma collection ne commence pas au tome 1
              </label>
            </div>
          )}

          {pastTotal && series?.total_volumes != null && (
            <p role="status" className="rounded-xl px-3 py-2 text-sm font-bold" style={{ background: "var(--surface-2, #fff)", color: "var(--ink)" }}>
              {`Cette série compte ${series.total_volumes} tome${series.total_volumes > 1 ? "s" : ""} parus. Tu en notes ${highestOwned}. Vérifie avant de continuer.`}
            </p>
          )}

          <Choice name="owned" selected={ownedMode === "list"} onSelect={() => setOwnedMode("list")} title="J'ai seulement certains tomes" hint="Il en manque au milieu" />
          {ownedMode === "list" && (
            <div className="manga-panel rounded-2xl p-3">
              <p className="mb-2 text-sm" style={{ color: "var(--muted)" }}>Touche les tomes que tu as.</p>
              <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8" role="group" aria-label="Tomes que tu as">
                {Array.from({ length: gridSize }, (_, i) => i + 1).map((n) => {
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
                      className={`flex aspect-square min-h-11 items-center justify-center rounded-lg text-sm font-bold ${on && !here ? "manga-panel-sm manga-press" : ""}`}
                      style={
                        here
                          ? { background: "var(--surface-raised)", color: "var(--ink)", border: "2px solid var(--ink)" }
                          : on
                            ? { background: "var(--accent)", color: "white" }
                            : { border: "2px dashed #5b6170", color: "var(--ink)" }
                      }
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              {gridSize < maxVolume && (
                <button
                  type="button"
                  onClick={() => setExtraTiles((n) => n + 30)}
                  className="manga-panel-sm manga-press mt-3 min-h-11 rounded-xl px-3 text-sm font-bold"
                  style={{ background: "var(--surface)", color: "var(--ink)" }}
                >
                  Afficher plus de tomes
                </button>
              )}
            </div>
          )}

          <Choice name="owned" selected={ownedMode === "none"} onSelect={() => setOwnedMode("none")} title="Aucun pour l'instant" hint="Je la suis, ou je l'ai lue ailleurs" />

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
          <h1 id="h-reading" ref={headingRef} tabIndex={-1} className="text-3xl outline-none sm:text-4xl" style={{ color: "var(--ink)" }}>Tu en es où ?</h1>
          <Choice name="reading" selected={readingMode === "none"} onSelect={() => setReadingMode("none")} title="Pas encore commencé" />
          {allOwned.length > 0 && (
            <Choice name="reading" selected={readingMode === "all_owned"} onSelect={() => setReadingMode("all_owned")} title="J'ai lu tous ceux que j'ai" />
          )}
          <Choice name="reading" selected={readingMode === "up_to"} onSelect={() => setReadingMode("up_to")} title="J'ai lu jusqu'au…" hint="Même des tomes que tu n'as pas" />
          {readingMode === "up_to" && (
            <div className="manga-panel rounded-2xl p-4">
              <Stepper label="Tome" value={readTo} min={1} max={maxVolume} onChange={setReadTo} big />
            </div>
          )}

          <div className="manga-panel-sm rounded-2xl" style={{ background: "var(--surface)" }}>
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
                <fieldset className="flex flex-col gap-1">
                  <legend className="mb-1 text-sm font-semibold">Quand les as-tu eus ?</legend>
                  {([
                    ["unknown", "Je ne sais pas"],
                    ["today", "Aujourd'hui"],
                    ["date", "Une autre date"],
                  ] as const).map(([v, label]) => (
                    <label key={v} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                      <input type="radio" name="when" checked={when === v} onChange={() => setWhen(v)} className="h-5 w-5" style={{ accentColor: "var(--accent)" }} />
                      {label}
                    </label>
                  ))}
                  {when === "date" && (
                    <input
                      type="date"
                      value={acquiredOn}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setAcquiredOn(e.target.value)}
                      aria-label="Date d'arrivée"
                      className="min-h-11 w-48 rounded-xl px-3 text-base outline-none focus:ring-2"
                      style={{ background: "var(--background)", border: "2px solid var(--ink)", color: "var(--foreground)" }}
                    />
                  )}
                </fieldset>
                <VolumeFields value={details} onChange={setDetails} disabled={isPending} />
                {ownedPreview.length > 1 && details.price && (
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Ce prix sera noté pour chacun des {ownedPreview.length} tomes.</p>
                )}
              </div>
            )}
          </div>

          {saveError && <p className="text-sm" role="alert" style={{ color: "var(--danger)" }}>{saveError}</p>}
          <PrimaryButton onClick={save} disabled={readingMode == null || isPending}>
            {isPending ? "J'enregistre…" : saveError ? "Réessayer" : "Ajouter à ma bibliothèque"}
          </PrimaryButton>
        </section>
      )}

      {step === "done" && series && saved && (
        <section className="manga-panel relative mt-4 flex flex-col items-center gap-5 overflow-hidden rounded-3xl px-6 py-10 text-center" aria-labelledby="h-done">
          <span aria-hidden="true" className="manga-speedlines pointer-events-none absolute inset-0" />
          <span
            aria-hidden="true"
            className="manga-sticker manga-pop relative flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{ background: "var(--pop)", color: "var(--ink)", transform: "rotate(-6deg)", ["--tilt" as string]: "-6deg" }}
          >
            <AppIcon name="check" size={40} strokeWidth={3.5} />
          </span>
          <p aria-hidden="true" className="font-display relative text-5xl leading-none sm:text-6xl" style={{ color: "var(--ink)" }}>
            C&apos;est fait !
          </p>
          <h1 id="h-done" ref={headingRef} tabIndex={-1} className="relative text-3xl outline-none sm:text-4xl" style={{ color: "var(--ink)" }}>
            {series.title} est dans ta bibliothèque !
          </h1>
          <p className="manga-sticker relative rounded-2xl px-4 py-2 text-base font-bold" style={{ background: "var(--ink, #12151d)", color: "white", transform: "rotate(1.5deg)" }}>
            {[
              saved.added_volumes ? `${saved.added_volumes} tome${saved.added_volumes > 1 ? "s" : ""} ajouté${saved.added_volumes > 1 ? "s" : ""}` : "Aucun nouveau tome",
              saved.added_readings ? `${saved.added_readings} lecture${saved.added_readings > 1 ? "s" : ""} notée${saved.added_readings > 1 ? "s" : ""}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="relative flex w-full flex-col gap-4 pt-2 sm:flex-row">
            <Link
              href={`/bibliotheque/${saved.manga_id}`}
              className="manga-button flex min-h-14 flex-1 items-center justify-center rounded-2xl px-6 text-lg font-bold text-white"
              style={{ background: "var(--accent)" }}
            >
              Voir la série
            </Link>
            <button type="button" onClick={restart} className="manga-panel-sm manga-press min-h-14 flex-1 rounded-2xl px-4 text-base font-bold" style={{ background: "var(--surface)", color: "var(--ink)" }}>
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
    <div className="flex items-center gap-4">
      <span className="manga-panel-sm h-24 w-16 shrink-0 overflow-hidden rounded-xl">
        <Cover shelf={{ manga_id: series.key, title: series.title, cover_url: series.cover_url }} volume={1} full />
      </span>
      <span className="min-w-0">
        <span className="font-display block text-2xl leading-tight" style={{ color: "var(--ink)" }}>{series.title}</span>
        <span className="block text-sm" style={{ color: "var(--muted)" }}>
          {[series.author, series.total_volumes ? `${series.total_volumes} tomes parus` : null, series.source.source === "private" ? "ajoutée par toi" : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
    </div>
  );
}

// Native radio under a styled label : arrow keys and grouping (by name) for free.
function Choice({
  name,
  selected,
  onSelect,
  title,
  hint,
}: {
  name: string;
  selected: boolean;
  onSelect: () => void;
  title: string;
  hint?: string;
}) {
  return (
    <label
      className="manga-press relative flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-left has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--accent)]"
      style={{
        background: selected ? "var(--pop)" : "var(--surface)",
        color: "var(--ink)",
        border: selected ? "3px solid var(--ink)" : "2px solid var(--ink)",
        boxShadow: selected ? "4px 4px 0 var(--ink)" : "none",
      }}
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{ border: "2.5px solid var(--ink)", background: "var(--surface)" }}
        aria-hidden="true"
      >
        {selected && <span className="h-3 w-3 rounded-full" style={{ background: "var(--ink)" }} />}
      </span>
      <span>
        <span className="block text-base font-bold">{title}</span>
        {hint && <span className="block text-sm" style={{ color: selected ? "var(--ink)" : "var(--muted)" }}>{hint}</span>}
      </span>
      <input
        type="radio"
        name={name}
        checked={selected}
        onChange={onSelect}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
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
  // What is typed stays as typed until the field is left : clamping each
  // keystroke would turn "12" into "52" when the minimum is 5.
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      <span className="w-full text-sm font-bold sm:w-auto" style={{ color: "var(--ink)" }}>{label}</span>
      {big && (
        <button type="button" onClick={() => onChange(clamp(value - 10))} className="manga-panel-sm manga-press h-12 min-w-12 rounded-xl px-2 text-sm font-bold" style={{ background: "var(--surface)", color: "var(--ink)" }} aria-label="Moins 10">
          −10
        </button>
      )}
      <button type="button" onClick={() => onChange(clamp(value - 1))} className="manga-panel-sm manga-press h-12 w-12 rounded-xl text-2xl font-bold" style={{ background: "var(--surface)", color: "var(--ink)" }} aria-label="Moins 1">
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft ?? value}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = Number(e.target.value);
          if (Number.isInteger(n) && n >= min && n <= max) onChange(n);
        }}
        onBlur={() => {
          if (draft !== null) onChange(clamp(Number(draft) || min));
          setDraft(null);
        }}
        aria-label={label}
        className={`font-display h-12 rounded-xl text-center tabular-nums outline-none focus:ring-2 ${big ? "w-24 text-4xl" : "w-20 text-2xl"}`}
        style={{ background: "var(--background)", border: "2px solid var(--ink)", color: "var(--ink)" }}
      />
      <button type="button" onClick={() => onChange(clamp(value + 1))} className="manga-panel-sm manga-press h-12 w-12 rounded-xl text-2xl font-bold" style={{ background: "var(--surface)", color: "var(--ink)" }} aria-label="Plus 1">
        +
      </button>
      {big && (
        <button type="button" onClick={() => onChange(clamp(value + 10))} className="manga-panel-sm manga-press h-12 min-w-12 rounded-xl px-2 text-sm font-bold" style={{ background: "var(--surface)", color: "var(--ink)" }} aria-label="Plus 10">
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
        style={{ background: "var(--surface)", border: "2px solid var(--ink)", color: "var(--foreground)" }}
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
      className="manga-button min-h-14 w-full rounded-2xl px-6 text-lg font-bold disabled:pointer-events-none disabled:opacity-60"
      style={disabled ? { background: "var(--surface-raised)", color: "var(--ink)" } : { background: "var(--accent)", color: "white" }}
    >
      {children}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-11 items-center gap-1.5 self-start text-sm font-bold" style={{ color: "var(--ink)" }}>
      <AppIcon name="arrow-left" size={16} /> Retour
    </button>
  );
}
