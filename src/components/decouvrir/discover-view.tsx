"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/app/app-icon";
import { Cover } from "@/components/collection/reader-home";
import { addWishlistItem } from "@/app/(app)/envies/actions";
import { dismissSuggestion, restoreSuggestions, saveDeclaredTastes } from "@/app/(app)/decouvrir/actions";
import {
  DEMOGRAPHIC_LABELS,
  GENRE_LABELS,
  GENRES,
  ageLabel,
  matchesFilters,
  type CatalogueEntry,
  type DeclaredTastes,
  type DiscoveryScope,
  type DiscoveryFilters,
  type LengthFilter,
} from "@/lib/discovery/suggest";
import { TERRITORIES, type TerritoryKey } from "@/lib/discovery/territories";

export type DiscoverCard = { entry: CatalogueEntry; reason?: string; note?: string | null };
export type Selection = { slug: string; title: string; description: string | null; items: DiscoverCard[] };
// A volume of the reader's own series to read next.
export type ContinueItem = {
  manga_id: string;
  title: string;
  cover_url: string | null;
  volume: number;
  reason: string;
  toFind: boolean; // not at home : can be wished
};

type Props = {
  continueItems: ContinueItem[];
  suggestions: DiscoverCard[];
  others: DiscoverCard[];
  selections: Selection[];
  catalogue: CatalogueEntry[];
  onShelf: string[];
  wished: string[];
  declared: DeclaredTastes;
  scope: DiscoveryScope;
  dismissedCount: number;
  hasHistory: boolean;
  initialTerritory: TerritoryKey | null;
};

const AGES = [
  { value: null, label: "Tous" },
  { value: 8, label: "Pour un lecteur de 8 ans" },
  { value: 10, label: "Pour un lecteur de 10 ans" },
  { value: 12, label: "Pour un lecteur de 12 ans" },
  { value: 14, label: "Pour un lecteur de 14 ans" },
] as const;

const LENGTHS: { value: LengthFilter | null; label: string }[] = [
  { value: null, label: "Toutes longueurs" },
  { value: "court", label: "Courtes (12 tomes max)" },
  { value: "moyen", label: "Moyennes (13 à 30)" },
  { value: "long", label: "Longues (plus de 30)" },
];

const NETWORK_ERROR = "Impossible de confirmer l'enregistrement. Vérifie ta connexion puis réessaie.";
const NO_FILTERS: DiscoveryFilters = { territory: null, genre: null, maxAge: null, status: null, length: null };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Toast = { ok: boolean; text: string; undo?: () => void };

export function DiscoverView({
  continueItems,
  suggestions,
  others,
  selections,
  catalogue,
  onShelf,
  wished,
  declared,
  scope,
  dismissedCount,
  hasHistory,
  initialTerritory,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<Toast | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<DiscoveryFilters>({ ...NO_FILTERS, territory: initialTerritory });
  const [shown, setShown] = useState(12);

  const shelfSet = useMemo(() => new Set(onShelf), [onShelf]);
  const wishSet = useMemo(() => new Set(wished), [wished]);

  const filtered = useMemo(
    () =>
      catalogue
        .filter((c) => matchesFilters(c, filters))
        .sort((a, b) => (a.top_50_rank ?? 999) - (b.top_50_rank ?? 999) || a.title.localeCompare(b.title, "fr")),
    [catalogue, filters]
  );
  const activeFilters = Object.values(filters).filter((v) => v != null).length;
  const setFilter = (patch: Partial<DiscoveryFilters>) => {
    setShown(12);
    setFilters((f) => ({ ...f, ...patch }));
  };

  function run(id: string, action: () => Promise<{ success: boolean; error?: string }>, ok: string, undo?: () => void) {
    setToast(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await action().catch(() => ({ success: false as const, error: NETWORK_ERROR }));
      setPendingId(null);
      if (!result.success) {
        setToast({ ok: false, text: result.error ?? NETWORK_ERROR });
        return;
      }
      setToast({ ok: true, text: ok, undo });
      router.refresh();
    });
  }

  const form = (entries: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(entries)) fd.set(k, v);
    return fd;
  };

  const wish = (id: string, title: string, volume: number) =>
    run(id, () => addWishlistItem(form({ manga_id: id, volume_number: String(volume) })), `${title}, tome ${volume}, est dans tes envies.`);

  const dismiss = (entry: CatalogueEntry) =>
    run(entry.id, () => dismissSuggestion(form({ manga_id: entry.id })), `${entry.title} ne te sera plus proposé.`, () =>
      run(entry.id, () => restoreSuggestions(form({ manga_id: entry.id })), `${entry.title} peut de nouveau t'être proposé.`)
    );

  const card = (c: DiscoverCard, canDismiss = false) => (
    <SeriesCard
      key={c.entry.id}
      card={c}
      onShelf={shelfSet.has(c.entry.id)}
      wished={wishSet.has(c.entry.id)}
      pending={isPending && pendingId === c.entry.id}
      onWish={() => wish(c.entry.id, c.entry.title, 1)}
      onDismiss={canDismiss ? () => dismiss(c.entry) : undefined}
    />
  );

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Découvrir</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Quoi lire ensuite, et pourquoi.</p>
      </header>

      {continueItems.length > 0 && (
        <section aria-labelledby="h-reprendre" className="flex flex-col gap-3">
          <h2 id="h-reprendre" className="text-lg font-bold">Reprendre tes lectures</h2>
          <ul className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">
            {continueItems.map((c) => (
              <li key={c.manga_id} className="flex gap-3 rounded-2xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <span className="h-24 w-16 shrink-0">
                  <Cover shelf={{ manga_id: c.manga_id, title: c.title, cover_url: c.cover_url }} volume={c.volume} full />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link href={`/bibliotheque/${c.manga_id}`} className="font-bold leading-snug hover:underline">
                    {c.title} · tome {c.volume}
                  </Link>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>{c.reason}</p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    <Link href={`/bibliotheque/${c.manga_id}`} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold" style={{ background: "var(--surface-raised)" }}>
                      Voir la série
                    </Link>
                    {c.toFind && !wishSet.has(c.manga_id) && (
                      <button
                        type="button"
                        onClick={() => wish(c.manga_id, c.title, c.volume)}
                        disabled={isPending && pendingId === c.manga_id}
                        className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold disabled:opacity-60"
                        style={{ background: "rgba(248,192,74,0.12)", color: "var(--gold)" }}
                      >
                        <AppIcon name="star" size={15} /> Je le veux
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="h-pour-toi" className="flex flex-col gap-3">
        <div>
          <h2 id="h-pour-toi" className="text-lg font-bold">Pour toi</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            D&apos;après ce que tu lis, ce que tu as aimé et les genres que tu as choisis.{" "}
            {scope === "youth_verified"
              ? "Seulement des séries recommandées pour la jeunesse par le CNLJ."
              : "Quand l'âge n'est pas vérifié, la carte le dit."}
          </p>
        </div>
        {suggestions.length > 0 ? (
          <ul className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">{suggestions.map((s) => card(s, true))}</ul>
        ) : (
          <p className="rounded-2xl p-4 text-sm" style={{ background: "var(--surface)", color: "var(--muted)" }}>
            {hasHistory
              ? "Aucune nouvelle suggestion pour l'instant. Dis ce que tu as aimé sur tes séries, ou choisis tes genres juste en dessous."
              : "Pas encore d'historique : choisis quelques genres juste en dessous, ou pioche dans nos sélections."}
          </p>
        )}
        {dismissedCount > 0 && (
          <button
            type="button"
            onClick={() => run("restore-all", () => restoreSuggestions(new FormData()), "Les suggestions écartées peuvent revenir.")}
            className="flex min-h-11 items-center self-start text-sm underline underline-offset-4"
            style={{ color: "var(--muted)" }}
          >
            {dismissedCount} suggestion{dismissedCount > 1 ? "s" : ""} écartée{dismissedCount > 1 ? "s" : ""} · Tout réafficher
          </button>
        )}
      </section>

      <TastesEditor
        key={`${declared.liked.join(",")}|${declared.avoided.join(",")}|${scope}`}
        declared={declared}
        scope={scope}
        openByDefault={!hasHistory && declared.liked.length === 0}
        pending={isPending && pendingId === "tastes"}
        onSave={(t) => run("tastes", () => saveDeclaredTastes(t), "Tes goûts sont enregistrés. Les suggestions sont à jour.")}
      />

      {others.length > 0 && (
        <section aria-labelledby="h-autre" className="flex flex-col gap-3">
          <div>
            <h2 id="h-autre" className="text-lg font-bold">Explorer un univers différent</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>Des territoires de ta carte des goûts encore peu visités.</p>
          </div>
          <ul className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">{others.map((s) => card(s, true))}</ul>
        </section>
      )}

      {selections.map((s) => (
        <section key={s.slug} aria-labelledby={`h-${s.slug}`} className="flex flex-col gap-3">
          <div>
            <h2 id={`h-${s.slug}`} className="text-lg font-bold">{s.title}</h2>
            {s.description && <p className="text-sm" style={{ color: "var(--muted)" }}>{s.description}</p>}
          </div>
          <ul className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">{s.items.map((i) => card(i))}</ul>
        </section>
      ))}

      <section id="explorer" aria-labelledby="h-explorer" className="flex scroll-mt-20 flex-col gap-3">
        <h2 id="h-explorer" className="text-lg font-bold">Explorer le catalogue</h2>
        <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:grid-cols-5">
          <Select
            label="Territoire"
            value={filters.territory ?? ""}
            onChange={(v) => setFilter({ territory: (v || null) as TerritoryKey | null })}
            options={[{ value: "", label: "Tous les territoires" }, ...TERRITORIES.map((t) => ({ value: t.key, label: t.label }))]}
          />
          <Select
            label="Genre"
            value={filters.genre ?? ""}
            onChange={(v) => setFilter({ genre: v || null })}
            options={[{ value: "", label: "Tous les genres" }, ...GENRES.map((g) => ({ value: g, label: cap(GENRE_LABELS[g]) }))]}
          />
          <Select
            label="Âge conseillé (avis CNLJ)"
            value={filters.maxAge == null ? "" : String(filters.maxAge)}
            onChange={(v) => setFilter({ maxAge: v ? Number(v) : null })}
            options={AGES.map((a) => ({ value: a.value == null ? "" : String(a.value), label: a.label }))}
          />
          <Select
            label="Parution"
            value={filters.status ?? ""}
            onChange={(v) => setFilter({ status: (v || null) as DiscoveryFilters["status"] })}
            options={[
              { value: "", label: "Terminées et en cours" },
              { value: "completed", label: "Séries terminées" },
              { value: "ongoing", label: "En cours de parution" },
            ]}
          />
          <Select
            label="Longueur"
            value={filters.length ?? ""}
            onChange={(v) => setFilter({ length: (v || null) as LengthFilter | null })}
            options={LENGTHS.map((l) => ({ value: l.value ?? "", label: l.label }))}
          />
        </div>
        {filters.maxAge != null && (
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Avec ce filtre, seules les séries ayant un âge conseillé par le CNLJ (Bibliothèque nationale de France) apparaissent.
            C&apos;est une indication, pas une garantie.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm" style={{ color: "var(--muted)" }}>
          <span aria-live="polite">{filtered.length} série{filtered.length > 1 ? "s" : ""}</span>
          {activeFilters > 0 && (
            <button type="button" onClick={() => setFilter(NO_FILTERS)} className="min-h-11 px-1 underline underline-offset-4">
              Effacer les filtres
            </button>
          )}
        </div>
        {filtered.length === 0 ? (
          <p className="rounded-2xl p-4 text-sm" style={{ background: "var(--surface)", color: "var(--muted)" }}>
            Aucune série ne correspond. Essaie avec moins de filtres.
          </p>
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">{filtered.slice(0, shown).map((entry) => card({ entry }))}</ul>
            {filtered.length > shown && (
              <button
                type="button"
                onClick={() => setShown((n) => n + 12)}
                className="min-h-12 self-center rounded-2xl px-5 text-sm font-semibold"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
              >
                Voir plus de séries ({filtered.length - shown})
              </button>
            )}
          </>
        )}
      </section>

      {/* Feedback stays in view whatever was tapped, even deep in the page. */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-6">
        {toast && (
          <div
            role={toast.ok ? "status" : "alert"}
            className="pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl py-1 pl-4 pr-1 text-sm font-semibold shadow-lg"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: toast.ok ? "var(--foreground)" : "var(--accent-hover)" }}
          >
            <span className="py-2">{toast.text}</span>
            {toast.undo && (
              <button type="button" onClick={toast.undo} className="min-h-11 shrink-0 px-2 underline underline-offset-4">
                Annuler
              </button>
            )}
            <button type="button" onClick={() => setToast(null)} aria-label="Fermer le message" className="flex h-11 w-11 shrink-0 items-center justify-center">
              <AppIcon name="close" size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Genres the reader likes or avoids. Three states per genre, plain words.
function TastesEditor({
  declared,
  scope,
  openByDefault,
  pending,
  onSave,
}: {
  declared: DeclaredTastes;
  scope: DiscoveryScope;
  openByDefault: boolean;
  pending: boolean;
  onSave: (t: DeclaredTastes & { scope: DiscoveryScope }) => void;
}) {
  const [liked, setLiked] = useState(new Set(declared.liked));
  const [avoided, setAvoided] = useState(new Set(declared.avoided));
  const [youth, setYouth] = useState(scope === "youth_verified");
  const same = (a: Set<string>, b: string[]) => [...a].sort().join() === [...b].sort().join();
  const changed = !same(liked, declared.liked) || !same(avoided, declared.avoided) || youth !== (scope === "youth_verified");

  function cycle(g: string) {
    // neutral → j'aime → j'évite → neutral
    if (liked.has(g)) {
      setLiked((s) => new Set([...s].filter((x) => x !== g)));
      setAvoided((s) => new Set(s).add(g));
    } else if (avoided.has(g)) {
      setAvoided((s) => new Set([...s].filter((x) => x !== g)));
    } else {
      setLiked((s) => new Set(s).add(g));
    }
  }

  return (
    <section id="mes-gouts" aria-label="Mes goûts" className="scroll-mt-20">
      <details open={openByDefault} className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <summary className="flex min-h-11 cursor-pointer flex-col justify-center">
          <span className="block text-lg font-bold">Mes goûts</span>
          <span className="block text-sm" style={{ color: "var(--muted)" }}>
            {declared.liked.length || declared.avoided.length
              ? [
                  declared.liked.length ? `Tu aimes : ${declared.liked.map((g) => GENRE_LABELS[g] ?? g).join(", ")}` : null,
                  declared.avoided.length ? `Tu évites : ${declared.avoided.map((g) => GENRE_LABELS[g] ?? g).join(", ")}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Dis ce qui te plaît : les suggestions démarrent même sans historique."}
          </span>
        </summary>
        <p className="mb-3 mt-3 text-sm" style={{ color: "var(--muted)" }}>
          Touche un genre : une fois pour « j&apos;aime », deux fois pour « j&apos;évite », trois fois pour revenir à neutre.
        </p>
        <ul className="flex flex-wrap gap-2" aria-label="Genres">
          {GENRES.map((g) => {
            const state = liked.has(g) ? "aime" : avoided.has(g) ? "evite" : null;
            return (
              <li key={g}>
                <button
                  type="button"
                  onClick={() => cycle(g)}
                  aria-label={`${cap(GENRE_LABELS[g])} : ${state === "aime" ? "j'aime" : state === "evite" ? "j'évite" : "neutre"}`}
                  className="flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold"
                  style={
                    state === "aime"
                      ? { background: "var(--read)", color: "white" }
                      : state === "evite"
                        ? { background: "var(--background)", color: "var(--muted)", border: "1.5px dashed var(--border)", textDecoration: "line-through" }
                        : { background: "var(--surface-raised)", border: "1px solid var(--border)" }
                  }
                >
                  {state === "aime" && <AppIcon name="check" size={14} strokeWidth={3} />}
                  {cap(GENRE_LABELS[g])}
                </button>
              </li>
            );
          })}
        </ul>
        <fieldset className="mt-5 flex flex-col gap-1">
          <legend className="mb-1 text-sm font-semibold">Ce que Découvrir te propose</legend>
          <label className="flex min-h-11 cursor-pointer items-start gap-2 text-sm">
            <input type="radio" name="scope" checked={!youth} onChange={() => setYouth(false)} className="mt-1 h-5 w-5 shrink-0" />
            <span>Tout le catalogue. Les séries sans âge vérifié sont signalées, et celles des magazines pour jeunes adultes ne sont proposées qu&apos;à qui en lit déjà.</span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-start gap-2 text-sm">
            <input type="radio" name="scope" checked={youth} onChange={() => setYouth(true)} className="mt-1 h-5 w-5 shrink-0" />
            <span>Seulement des séries recommandées pour la jeunesse par le CNLJ (Bibliothèque nationale de France). Moins de choix, et c&apos;est une indication, pas une garantie.</span>
          </label>
        </fieldset>
        <button
          type="button"
          onClick={() => onSave({ liked: [...liked], avoided: [...avoided], scope: youth ? "youth_verified" : "all" })}
          disabled={pending || !changed}
          className="mt-4 min-h-12 rounded-2xl px-5 text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))" }}
        >
          {pending ? "J'enregistre…" : "Enregistrer mes goûts"}
        </button>
      </details>
    </section>
  );
}

function SeriesCard({
  card,
  onShelf,
  wished,
  pending,
  onWish,
  onDismiss,
}: {
  card: DiscoverCard;
  onShelf: boolean;
  wished: boolean;
  pending: boolean;
  onWish: () => void;
  onDismiss?: () => void;
}) {
  const e = card.entry;
  const facts = [
    ageLabel(e),
    e.total_volumes ? `${e.total_volumes} tomes` : null,
    e.status === "completed" ? "terminée" : "en cours",
  ].filter(Boolean);
  return (
    <li className="flex gap-3 rounded-2xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <Link href={`/bibliotheque/${e.id}`} className="h-[120px] w-20 shrink-0" aria-hidden="true" tabIndex={-1}>
        <Cover shelf={{ manga_id: e.id, title: e.title, cover_url: e.cover_url }} volume={1} full />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Link href={`/bibliotheque/${e.id}`} className="font-bold leading-snug hover:underline">
          {e.title}
        </Link>
        {card.reason && <p className="text-sm font-semibold" style={{ color: "var(--read)" }}>{card.reason}</p>}
        {card.note && <p className="text-sm" style={{ color: "var(--muted)" }}>{card.note}</p>}
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {[...e.genres.slice(0, 3).map((g) => GENRE_LABELS[g] ?? g), e.demographic ? DEMOGRAPHIC_LABELS[e.demographic] : null].filter(Boolean).join(" · ")}
        </p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>{facts.join(" · ")}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {onShelf ? (
            <Link href={`/bibliotheque/${e.id}`} className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold" style={{ background: "var(--surface-raised)" }}>
              <AppIcon name="check" size={15} strokeWidth={3} /> Dans ta bibliothèque
            </Link>
          ) : (
            <>
              <Link
                href={`/ajouter?serie=${e.id}`}
                className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))" }}
              >
                <AppIcon name="plus" size={15} strokeWidth={2.5} /> J&apos;ai des tomes
              </Link>
              {wished ? (
                <span className="flex min-h-11 items-center gap-1 px-1 text-sm font-semibold" style={{ color: "var(--gold)" }}>
                  <AppIcon name="star" size={15} filled /> Dans tes envies
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onWish}
                  disabled={pending}
                  className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold disabled:opacity-60"
                  style={{ background: "rgba(248,192,74,0.12)", color: "var(--gold)" }}
                >
                  <AppIcon name="star" size={15} /> {pending ? "…" : "Je le veux"}
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  disabled={pending}
                  className="flex min-h-11 items-center px-2 text-sm underline underline-offset-4 disabled:opacity-60"
                  style={{ color: "var(--muted)" }}
                >
                  Pas pour moi
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 rounded-xl px-3 text-base font-normal outline-none focus:ring-2"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
