"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/app/app-icon";
import { Cover } from "@/components/collection/reader-home";
import { addWishlistItem } from "@/app/(app)/envies/actions";
import {
  DEMOGRAPHIC_LABELS,
  GENRE_LABELS,
  GENRES,
  matchesFilters,
  type CatalogueEntry,
  type DiscoveryFilters,
  type LengthFilter,
} from "@/lib/discovery/suggest";

export type DiscoverCard = { entry: CatalogueEntry; reason?: string; note?: string | null };
export type Selection = { slug: string; title: string; description: string | null; items: DiscoverCard[] };

type Props = {
  suggestions: DiscoverCard[];
  selections: Selection[];
  catalogue: CatalogueEntry[];
  onShelf: string[]; // manga ids in the library
  wished: string[]; // manga ids with at least one wish
  hasLibrary: boolean;
};

const AGES = [
  { value: null, label: "Tous âges" },
  { value: 8, label: "Jusqu'à 8 ans" },
  { value: 10, label: "Jusqu'à 10 ans" },
  { value: 12, label: "Jusqu'à 12 ans" },
  { value: 14, label: "Jusqu'à 14 ans" },
] as const;

const LENGTHS: { value: LengthFilter | null; label: string }[] = [
  { value: null, label: "Toutes longueurs" },
  { value: "court", label: "Courtes (12 tomes max)" },
  { value: "moyen", label: "Moyennes (13 à 30)" },
  { value: "long", label: "Longues (plus de 30)" },
];

const NETWORK_ERROR = "Impossible de confirmer l'enregistrement. Vérifie ta connexion puis réessaie.";

export function DiscoverView({ suggestions, selections, catalogue, onShelf, wished, hasLibrary }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<DiscoveryFilters>({ genre: null, maxAge: null, status: null, length: null });

  const shelfSet = useMemo(() => new Set(onShelf), [onShelf]);
  const wishSet = useMemo(() => new Set(wished), [wished]);

  const filtered = useMemo(
    () => catalogue.filter((c) => matchesFilters(c, filters)).sort((a, b) => (a.top_50_rank ?? 999) - (b.top_50_rank ?? 999) || a.title.localeCompare(b.title, "fr")),
    [catalogue, filters]
  );
  const activeFilters = Object.values(filters).filter((v) => v != null).length;

  function wish(entry: CatalogueEntry) {
    setMessage(null);
    setPendingId(entry.id);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("manga_id", entry.id);
      fd.set("volume_number", "1");
      const result = await addWishlistItem(fd).catch(() => ({ success: false as const, error: NETWORK_ERROR }));
      setPendingId(null);
      if (!result.success) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      setMessage({ ok: true, text: `${entry.title}, tome 1, est dans tes envies.` });
      router.refresh();
    });
  }

  const card = (c: DiscoverCard) => (
    <SeriesCard
      key={c.entry.id}
      card={c}
      onShelf={shelfSet.has(c.entry.id)}
      wished={wishSet.has(c.entry.id)}
      pending={isPending && pendingId === c.entry.id}
      onWish={() => wish(c.entry)}
    />
  );

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Découvrir</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Des séries que tu pourrais aimer, et pourquoi.</p>
      </header>

      <div aria-live="polite">
        {message && (
          <p className="rounded-2xl px-4 py-3 text-sm font-semibold" role={message.ok ? "status" : "alert"} style={{ background: "var(--surface)", color: message.ok ? "var(--read)" : "var(--accent-hover)" }}>
            {message.text}
          </p>
        )}
      </div>

      <section aria-labelledby="h-pour-toi" className="flex flex-col gap-3">
        <h2 id="h-pour-toi" className="text-lg font-bold">Pour toi</h2>
        {suggestions.length > 0 ? (
          <ul className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">{suggestions.map(card)}</ul>
        ) : (
          <p className="rounded-2xl p-4 text-sm" style={{ background: "var(--surface)", color: "var(--muted)" }}>
            {hasLibrary
              ? "Note quelques lectures dans ta bibliothèque : les suggestions se basent sur ce que tu lis."
              : "Ajoute les séries que tu lis : on te proposera des idées qui leur ressemblent. En attendant, voici nos sélections."}
          </p>
        )}
      </section>

      {selections.map((s) => (
        <section key={s.slug} aria-labelledby={`h-${s.slug}`} className="flex flex-col gap-3">
          <div>
            <h2 id={`h-${s.slug}`} className="text-lg font-bold">{s.title}</h2>
            {s.description && <p className="text-sm" style={{ color: "var(--muted)" }}>{s.description}</p>}
          </div>
          <ul className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">{s.items.map(card)}</ul>
        </section>
      ))}

      <section aria-labelledby="h-explorer" className="flex flex-col gap-3">
        <h2 id="h-explorer" className="text-lg font-bold">Explorer le catalogue</h2>
        <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Genre"
            value={filters.genre ?? ""}
            onChange={(v) => setFilters((f) => ({ ...f, genre: v || null }))}
            options={[{ value: "", label: "Tous les genres" }, ...GENRES.map((g) => ({ value: g, label: GENRE_LABELS[g] }))]}
          />
          <Select
            label="Âge"
            value={filters.maxAge == null ? "" : String(filters.maxAge)}
            onChange={(v) => setFilters((f) => ({ ...f, maxAge: v ? Number(v) : null }))}
            options={AGES.map((a) => ({ value: a.value == null ? "" : String(a.value), label: a.label }))}
          />
          <Select
            label="Parution"
            value={filters.status ?? ""}
            onChange={(v) => setFilters((f) => ({ ...f, status: (v || null) as DiscoveryFilters["status"] }))}
            options={[
              { value: "", label: "Terminées et en cours" },
              { value: "completed", label: "Séries terminées" },
              { value: "ongoing", label: "En cours de parution" },
            ]}
          />
          <Select
            label="Longueur"
            value={filters.length ?? ""}
            onChange={(v) => setFilters((f) => ({ ...f, length: (v || null) as LengthFilter | null }))}
            options={LENGTHS.map((l) => ({ value: l.value ?? "", label: l.label }))}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm" style={{ color: "var(--muted)" }}>
          <span aria-live="polite">{filtered.length} série{filtered.length > 1 ? "s" : ""}</span>
          {activeFilters > 0 && (
            <button type="button" onClick={() => setFilters({ genre: null, maxAge: null, status: null, length: null })} className="min-h-10 underline underline-offset-4">
              Effacer les filtres
            </button>
          )}
        </div>
        {filtered.length === 0 ? (
          <p className="rounded-2xl p-4 text-sm" style={{ background: "var(--surface)", color: "var(--muted)" }}>
            Aucune série ne correspond. Essaie avec moins de filtres.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">{filtered.slice(0, 60).map((entry) => card({ entry }))}</ul>
        )}
      </section>
    </div>
  );
}

function SeriesCard({
  card,
  onShelf,
  wished,
  pending,
  onWish,
}: {
  card: DiscoverCard;
  onShelf: boolean;
  wished: boolean;
  pending: boolean;
  onWish: () => void;
}) {
  const e = card.entry;
  const facts = [
    e.audience_min_age != null ? `dès ${e.audience_min_age} ans` : null,
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
            <Link href={`/bibliotheque/${e.id}`} className="flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-semibold" style={{ background: "var(--surface-raised)" }}>
              <AppIcon name="check" size={15} strokeWidth={3} /> Dans ta bibliothèque
            </Link>
          ) : (
            <>
              <Link
                href={`/ajouter?serie=${e.id}`}
                className="flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))" }}
              >
                <AppIcon name="plus" size={15} strokeWidth={2.5} /> J&apos;ai des tomes
              </Link>
              {wished ? (
                <span className="flex min-h-10 items-center gap-1 px-1 text-sm font-semibold" style={{ color: "var(--gold)" }}>
                  <AppIcon name="star" size={15} filled /> Dans tes envies
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onWish}
                  disabled={pending}
                  className="flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-semibold disabled:opacity-60"
                  style={{ background: "rgba(248,192,74,0.12)", color: "var(--gold)" }}
                >
                  <AppIcon name="star" size={15} /> {pending ? "…" : "Je le veux"}
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
