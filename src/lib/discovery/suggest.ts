// Discovery helpers — pure functions, shared by the Découvrir page and tests.
//
// A suggestion is a curated catalogue series the reader does not have yet,
// scored by what it shares with what the reader likes : genres, the
// demographic and the author. Every suggestion carries a reason built from
// real data ("Parce que tu as aimé One Piece : aventure").
//
// Weighting (simple and explainable, see docs/decouverte.md) :
//   each series counts the same whatever its length ;
//   read at least one volume → 1 ; only owned → 0.25 ;
//   "J'ai aimé" → +1 ; "Pas pour moi" → 0 ;
//   each genre the reader declares liking → 1.
// Declared tastes and "J'ai aimé" are what the reader SAYS ; volumes owned
// are a weak signal only.

import type { Demographic } from "@/lib/types/database";
import { territoriesOf, territoryLabel, TERRITORIES, type TerritoryKey } from "./territories";
export const GENRES = [
  "action",
  "aventure",
  "comedie",
  "drame",
  "fantasy",
  "science-fiction",
  "mystere",
  "horreur",
  "romance",
  "sport",
  "tranche-de-vie",
  "surnaturel",
  "historique",
  "cuisine",
  "psychologique",
] as const;
export type Genre = (typeof GENRES)[number];

export const GENRE_LABELS: Record<string, string> = {
  action: "action",
  aventure: "aventure",
  comedie: "comédie",
  drame: "drame",
  fantasy: "fantasy",
  "science-fiction": "science-fiction",
  mystere: "mystère",
  horreur: "horreur",
  romance: "romance",
  sport: "sport",
  "tranche-de-vie": "tranche de vie",
  surnaturel: "surnaturel",
  historique: "historique",
  cuisine: "cuisine",
  psychologique: "psychologique",
};

// Plain words first ; the Japanese term in brackets for those who know it.
export const DEMOGRAPHIC_LABELS: Record<Demographic, string> = {
  kodomo: "jeunesse",
  shonen: "ado (shōnen)",
  shojo: "ado (shōjo)",
  seinen: "jeune adulte (seinen)",
  josei: "jeune adulte (josei)",
};

export type CatalogueEntry = {
  id: string;
  title: string;
  author: string | null;
  genres: string[];
  demographic: Demographic | null;
  audience_min_age: number | null;
  audience_age_source?: "cnlj" | "estimate" | null;
  audience_age_scope?: "series" | "volume" | null; // what the CNLJ recommendation covers
  audience_age_volumes?: number[] | null; // the volumes, when scope = volume
  total_volumes: number | null;
  status: "ongoing" | "completed" | "paused";
  top_50_rank: number | null;
  cover_url: string | null;
};

// What the reader has, per series.
export type ReaderSeries = {
  manga_id: string;
  read: number; // volumes read
  owned: number; // volumes at home
  liked?: boolean | null; // "J'ai aimé" true, "Pas pour moi" false, null : nothing said
  title?: string;
};

// Tastes the reader declared.
export type DeclaredTastes = { liked: string[]; avoided: string[] };
const NO_TASTES: DeclaredTastes = { liked: [], avoided: [] };

export type Suggestion = {
  entry: CatalogueEntry;
  score: number;
  reason: string;
  because: string[]; // titles of the reader's series that drove it
};

export function seriesWeight(s: ReaderSeries): number {
  if (s.liked === false) return 0;
  const base = s.read > 0 ? 1 : s.owned > 0 ? 0.25 : 0;
  return base + (s.liked === true ? 1 : 0);
}

export type TasteProfile = {
  genres: Map<string, number>;
  demographics: Map<string, number>;
  authors: Map<string, number>;
  total: number;
};

export function tasteProfile(
  library: ReaderSeries[],
  catalogue: Map<string, CatalogueEntry>,
  declared: DeclaredTastes = NO_TASTES
): TasteProfile {
  const genres = new Map<string, number>();
  const demographics = new Map<string, number>();
  const authors = new Map<string, number>();
  let total = 0;
  for (const s of library) {
    const entry = catalogue.get(s.manga_id);
    if (!entry) continue;
    const w = seriesWeight(s);
    if (w === 0) continue;
    total += w;
    for (const g of entry.genres) genres.set(g, (genres.get(g) ?? 0) + w / Math.max(entry.genres.length, 1));
    if (entry.demographic) demographics.set(entry.demographic, (demographics.get(entry.demographic) ?? 0) + w);
    if (entry.author) authors.set(entry.author, (authors.get(entry.author) ?? 0) + w);
  }
  for (const g of declared.liked) {
    genres.set(g, (genres.get(g) ?? 0) + 1);
    total += 1;
  }
  return { genres, demographics, authors, total };
}

const joinFr = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;

export type DiscoveryScope = "all" | "youth_verified";

export type SuggestOptions = {
  limit?: number;
  maxAge?: number | null; // explicit cap (overrides the comfort age)
  declared?: DeclaredTastes;
  scope?: DiscoveryScope;
};

// ─────────────────────────────────────────
// Content rules (docs/politique-contenu.md). Only verified information is
// used ; anything else counts as unknown.
//   A verified age : a CNLJ recommendation covering the whole series. A
//   recommendation on some volumes is shown as such, never extended to the
//   series. Unverified estimates are not used at all.
// ─────────────────────────────────────────

export function verifiedAge(c: CatalogueEntry): number | null {
  return c.audience_age_source === "cnlj" && c.audience_age_scope === "series" ? c.audience_min_age : null;
}

// What to say about a series' age, from verified information only.
export function ageLabel(c: CatalogueEntry): string {
  if (c.audience_age_source === "cnlj" && c.audience_min_age != null) {
    if (c.audience_age_scope === "series") return `conseillé dès ${c.audience_min_age} ans (CNLJ)`;
    const v = c.audience_age_volumes ?? [];
    if (c.audience_age_scope === "volume" && v.length) {
      // a review of some volumes, not a recommendation for the series
      return `avis CNLJ sur ${v.length > 1 ? "les tomes" : "le tome"} ${v.join(", ")} (dès ${c.audience_min_age} ans)`;
    }
  }
  return "âge non vérifié";
}

// Japanese magazines aimed at young adults. Descriptive catalogue data, not
// an age rating : used only to hold such series back from readers who do
// not read them already.
const ADULT_TARGET = new Set(["seinen", "josei"]);

export function readsAdultTarget(library: ReaderSeries[], catalogue: Map<string, CatalogueEntry>): boolean {
  return library.some((s) => (s.read > 0 || s.liked === true) && ADULT_TARGET.has(catalogue.get(s.manga_id)?.demographic ?? ""));
}

// Prudence : with verified ages among the series read, suggestions stay at
// most two years above the highest of them. null without any verified age.
export function comfortAge(library: ReaderSeries[], catalogue: Map<string, CatalogueEntry>): number | null {
  let max: number | null = null;
  for (const s of library) {
    if (s.read === 0) continue;
    const entry = catalogue.get(s.manga_id);
    const age = entry ? verifiedAge(entry) : null;
    if (age != null && (max == null || age > max)) max = age;
  }
  return max == null ? null : max + 2;
}

export type ContentContext = {
  scope: DiscoveryScope;
  maxAge: number | null;
  adultTargetOk: boolean;
  declared: DeclaredTastes;
};

// May this series be PROPOSED (suggestion, other universe, map discovery) ?
// Browsing the catalogue with filters stays open.
export function contentAllowed(c: CatalogueEntry, ctx: ContentContext): boolean {
  if (avoids(c, ctx.declared)) return false;
  const age = verifiedAge(c);
  if (ctx.scope === "youth_verified") return age != null && (ctx.maxAge == null || age <= ctx.maxAge);
  if (age != null) return ctx.maxAge == null || age <= ctx.maxAge;
  // unknown age : no young-adult magazine series for a reader who does not read them
  return !(c.demographic && ADULT_TARGET.has(c.demographic)) || ctx.adultTargetOk;
}

export function contentContext(library: ReaderSeries[], byId: Map<string, CatalogueEntry>, declared: DeclaredTastes, scope: DiscoveryScope, maxAge?: number | null): ContentContext {
  return {
    scope,
    maxAge: maxAge ?? comfortAge(library, byId),
    adultTargetOk: readsAdultTarget(library, byId),
    declared,
  };
}

function avoids(c: CatalogueEntry, declared: DeclaredTastes) {
  return c.genres.some((g) => declared.avoided.includes(g));
}

export function suggest(
  library: ReaderSeries[],
  catalogue: CatalogueEntry[],
  excluded: Set<string>, // in the library, wished, or set aside
  { limit = 12, maxAge = null, declared = NO_TASTES, scope = "all" }: SuggestOptions = {}
): Suggestion[] {
  const byId = new Map(catalogue.map((c) => [c.id, c]));
  const profile = tasteProfile(library, byId, declared);
  if (profile.total === 0) return [];
  const ctx = contentContext(library, byId, declared, scope, maxAge);

  const readerSeries = library
    .map((s) => ({ s, entry: byId.get(s.manga_id), w: seriesWeight(s) }))
    .filter((x): x is { s: ReaderSeries; entry: CatalogueEntry; w: number } => x.entry != null && x.w > 0);

  const out: Suggestion[] = [];
  for (const c of catalogue) {
    if (excluded.has(c.id)) continue;
    if (!contentAllowed(c, ctx)) continue;
    if (c.genres.length === 0 && !c.demographic) continue;

    let score = 0;
    for (const g of c.genres) score += (profile.genres.get(g) ?? 0) / profile.total;
    if (c.demographic) score += 0.5 * ((profile.demographics.get(c.demographic) ?? 0) / profile.total);
    const sameAuthor = c.author ? profile.authors.get(c.author) ?? 0 : 0;
    if (sameAuthor > 0) score += 0.35;
    // A light popularity prior only breaks ties.
    if (c.top_50_rank != null) score += (51 - c.top_50_rank) / 1000;
    if (score <= 0.05) continue;

    // Reason : the reader's series sharing the most with this one, liked
    // ones first ; otherwise the genres the reader declared.
    const shared = readerSeries
      .map(({ s, entry, w }) => {
        const common = entry.genres.filter((g) => c.genres.includes(g));
        const author = c.author != null && entry.author === c.author;
        return { s, entry, w, common, author, strength: (common.length + (author ? 2 : 0)) * w };
      })
      .filter((x) => x.strength > 0)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 2);
    const declaredCommon = c.genres.filter((g) => declared.liked.includes(g));
    if (shared.length === 0 && declaredCommon.length === 0) continue;

    let reason: string;
    const authorMatch = shared.find((x) => x.author);
    if (authorMatch) {
      reason = `Du même auteur que ${authorMatch.entry.title}`;
    } else if (shared.length) {
      const commonGenres = [...new Set(shared.flatMap((x) => x.common))].slice(0, 2).map((g) => GENRE_LABELS[g] ?? g);
      const liked = shared.filter((x) => x.s.liked === true).map((x) => x.entry.title);
      const read = shared.filter((x) => x.s.liked !== true && x.s.read > 0).map((x) => x.entry.title);
      const owned = shared.filter((x) => x.s.liked !== true && x.s.read === 0).map((x) => x.entry.title);
      const verb = liked.length
        ? `Parce que tu as aimé ${joinFr(liked)}`
        : read.length
          ? `Parce que tu lis ${joinFr(read)}`
          : `Parce que tu as ${joinFr(owned)} chez toi`;
      reason = `${verb}${commonGenres.length ? ` : ${joinFr(commonGenres)}` : ""}`;
    } else {
      reason = `Parce que tu aimes ${joinFr(declaredCommon.slice(0, 2).map((g) => GENRE_LABELS[g] ?? g))}`;
    }

    out.push({ entry: c, score, reason, because: shared.map((x) => x.entry.title) });
  }

  return out.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, "fr")).slice(0, limit);
}

// ─────────────────────────────────────────
// Taste by territory (the taste map)
// ─────────────────────────────────────────

export type TerritoryTaste = {
  key: TerritoryKey;
  label: string;
  hint: string;
  share: number; // 0..1 of the reader's taste
  series: { manga_id: string; title: string; liked: boolean | null; read: number; owned: number }[];
  declared: boolean; // a liked genre of the reader is in this territory
  avoided: boolean; // every genre of this territory is avoided
};

// Each series spreads its weight evenly over the territories it touches,
// so a series is never worth more than another because it has more genres
// or more volumes.
export function territoryTastes(
  library: ReaderSeries[],
  catalogue: Map<string, CatalogueEntry>,
  declared: DeclaredTastes = NO_TASTES
): TerritoryTaste[] {
  const score = new Map<TerritoryKey, number>();
  const members = new Map<TerritoryKey, TerritoryTaste["series"]>();
  for (const s of library) {
    const entry = catalogue.get(s.manga_id);
    if (!entry) continue;
    const ts = territoriesOf(entry.genres);
    const w = seriesWeight(s);
    for (const t of ts) {
      if (w > 0) score.set(t, (score.get(t) ?? 0) + w / ts.length);
      if (s.read + s.owned > 0 || s.liked != null) {
        const list = members.get(t) ?? [];
        list.push({ manga_id: s.manga_id, title: entry.title, liked: s.liked ?? null, read: s.read, owned: s.owned });
        members.set(t, list);
      }
    }
  }
  for (const g of declared.liked) {
    const [t] = territoriesOf([g]);
    if (t) score.set(t, (score.get(t) ?? 0) + 1);
  }
  const total = [...score.values()].reduce((a, b) => a + b, 0);
  return TERRITORIES.map((t) => ({
    key: t.key,
    label: t.label,
    hint: t.hint,
    share: total > 0 ? (score.get(t.key) ?? 0) / total : 0,
    series: (members.get(t.key) ?? []).sort((a, b) => Number(b.liked === true) - Number(a.liked === true) || b.read - a.read || a.title.localeCompare(b.title, "fr")),
    declared: t.genres.some((g) => declared.liked.includes(g)),
    avoided: t.genres.every((g) => declared.avoided.includes(g)),
  }));
}

// Curated series of one territory the reader does not have, most known first.
export function territoryDiscoveries(
  key: TerritoryKey,
  catalogue: CatalogueEntry[],
  excluded: Set<string>,
  ctx: ContentContext,
  limit = 3
): CatalogueEntry[] {
  return catalogue
    .filter((c) => !excluded.has(c.id) && contentAllowed(c, ctx) && territoriesOf(c.genres).includes(key))
    .sort((a, b) => (a.top_50_rank ?? 999) - (b.top_50_rank ?? 999) || a.title.localeCompare(b.title, "fr"))
    .slice(0, limit);
}

// "Explorer un univers différent" : one series from each territory the
// reader has explored least (and does not avoid).
export function otherUniverses(
  library: ReaderSeries[],
  catalogue: CatalogueEntry[],
  excluded: Set<string>,
  { limit = 3, declared = NO_TASTES, scope = "all" }: { limit?: number; declared?: DeclaredTastes; scope?: DiscoveryScope } = {}
): { entry: CatalogueEntry; reason: string }[] {
  const byId = new Map(catalogue.map((c) => [c.id, c]));
  const tastes = territoryTastes(library, byId, declared);
  if (tastes.every((t) => t.share === 0)) return [];
  const ctx = contentContext(library, byId, declared, scope);
  const out: { entry: CatalogueEntry; reason: string }[] = [];
  const taken = new Set(excluded);
  for (const t of [...tastes].filter((t) => !t.avoided).sort((a, b) => a.share - b.share)) {
    if (out.length >= limit || t.share >= 0.25) break;
    const [pick] = territoryDiscoveries(t.key, catalogue, taken, ctx, 1);
    if (!pick) continue;
    taken.add(pick.id);
    out.push({
      entry: pick,
      reason: t.share === 0 ? `Pour changer : ${territoryLabel(t.key).toLowerCase()}, un univers que tu n'as pas encore exploré` : `Pour changer : un peu plus de ${territoryLabel(t.key).toLowerCase()}`,
    });
  }
  return out;
}

// ─────────────────────────────────────────
// Simple filters for the catalogue browser
// ─────────────────────────────────────────

export type LengthFilter = "court" | "moyen" | "long";

export type DiscoveryFilters = {
  territory?: TerritoryKey | null;
  genre?: string | null;
  maxAge?: number | null;
  status?: "completed" | "ongoing" | null;
  length?: LengthFilter | null;
};

export function lengthOf(total: number | null): LengthFilter | null {
  if (total == null) return null;
  if (total <= 12) return "court";
  if (total <= 30) return "moyen";
  return "long";
}

export function matchesFilters(c: CatalogueEntry, f: DiscoveryFilters): boolean {
  if (f.territory && !territoriesOf(c.genres).includes(f.territory)) return false;
  if (f.genre && !c.genres.includes(f.genre)) return false;
  // Age filter : only the CNLJ indication counts. Unknown or estimated
  // ages are left out when the filter is on.
  if (f.maxAge != null) {
    const age = verifiedAge(c);
    if (age == null || age > f.maxAge) return false;
  }
  if (f.status === "completed" && c.status !== "completed") return false;
  if (f.status === "ongoing" && c.status === "completed") return false;
  if (f.length && lengthOf(c.total_volumes) !== f.length) return false;
  return true;
}
