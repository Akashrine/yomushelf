// Discovery helpers — pure functions, shared by the Découvrir page and tests.
//
// A suggestion is a catalogue series the reader does not have yet, scored
// by what it shares with the series they actually read : genres, the
// demographic (shōnen, seinen…) and the author. Every suggestion carries
// a human reason ("Parce que tu lis One Piece et Dr. Stone : aventure").
// Readings weigh more than owned-but-unread volumes : taste is what you
// read, not what you bought.

import type { Demographic } from "@/lib/types/database";

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

export const DEMOGRAPHIC_LABELS: Record<Demographic, string> = {
  kodomo: "kodomo",
  shonen: "shōnen",
  shojo: "shōjo",
  seinen: "seinen",
  josei: "josei",
};

export type CatalogueEntry = {
  id: string;
  title: string;
  author: string | null;
  genres: string[];
  demographic: Demographic | null;
  audience_min_age: number | null;
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
};

export type Suggestion = {
  entry: CatalogueEntry;
  score: number;
  reason: string;
  because: string[]; // titles of the reader's series that drove it
};

const READ_WEIGHT = 1;
const OWNED_WEIGHT = 0.25;

function seriesWeight(s: ReaderSeries) {
  // Diminishing returns : a 100-volume series must not drown the others.
  return Math.log2(1 + s.read * READ_WEIGHT + s.owned * OWNED_WEIGHT);
}

export type TasteProfile = {
  genres: Map<string, number>;
  demographics: Map<string, number>;
  authors: Map<string, number>;
  total: number;
};

export function tasteProfile(
  library: ReaderSeries[],
  catalogue: Map<string, CatalogueEntry>
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
  return { genres, demographics, authors, total };
}

const joinFr = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;

export type SuggestOptions = {
  limit?: number;
  maxAge?: number | null; // only series whose minimum age is at most this
};

// Suggestions stay close to what the reader already reads : at most two
// years above the oldest recommended age among the series they read.
// null when nothing read has a known age (no cap). This only shapes
// suggestions ; browsing the catalogue stays open.
export function comfortAge(library: ReaderSeries[], catalogue: Map<string, CatalogueEntry>): number | null {
  let max: number | null = null;
  for (const s of library) {
    if (s.read === 0) continue;
    const age = catalogue.get(s.manga_id)?.audience_min_age;
    if (age != null && (max == null || age > max)) max = age;
  }
  return max == null ? null : max + 2;
}

export function suggest(
  library: ReaderSeries[],
  catalogue: CatalogueEntry[],
  excluded: Set<string>, // already in the library or in the wishlist
  { limit = 12, maxAge = null }: SuggestOptions = {}
): Suggestion[] {
  const byId = new Map(catalogue.map((c) => [c.id, c]));
  const profile = tasteProfile(library, byId);
  if (profile.total === 0) return [];
  if (maxAge === undefined || maxAge === null) maxAge = comfortAge(library, byId);

  const readerSeries = library
    .map((s) => ({ s, entry: byId.get(s.manga_id), w: seriesWeight(s) }))
    .filter((x): x is { s: ReaderSeries; entry: CatalogueEntry; w: number } => x.entry != null && x.w > 0);

  const out: Suggestion[] = [];
  for (const c of catalogue) {
    if (excluded.has(c.id)) continue;
    if (maxAge != null && c.audience_min_age != null && c.audience_min_age > maxAge) continue;
    if (c.genres.length === 0 && !c.demographic) continue;

    let score = 0;
    for (const g of c.genres) score += (profile.genres.get(g) ?? 0) / profile.total;
    if (c.demographic) score += 0.5 * ((profile.demographics.get(c.demographic) ?? 0) / profile.total);
    const sameAuthor = c.author ? profile.authors.get(c.author) ?? 0 : 0;
    if (sameAuthor > 0) score += 0.35;
    // A light popularity prior only breaks ties.
    if (c.top_50_rank != null) score += (51 - c.top_50_rank) / 1000;
    if (score <= 0.05) continue;

    // Reason : the reader's series sharing the most with this one.
    const shared = readerSeries
      .map(({ entry, w }) => {
        const common = entry.genres.filter((g) => c.genres.includes(g));
        const author = c.author != null && entry.author === c.author;
        return { entry, w, common, author, strength: (common.length + (author ? 2 : 0)) * w };
      })
      .filter((x) => x.strength > 0)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 2);
    if (shared.length === 0) continue;

    const authorMatch = shared.find((x) => x.author);
    const commonGenres = [...new Set(shared.flatMap((x) => x.common))].slice(0, 2).map((g) => GENRE_LABELS[g] ?? g);
    const titles = shared.map((x) => x.entry.title);
    const reason = authorMatch
      ? `Du même auteur que ${authorMatch.entry.title}`
      : `Parce que tu lis ${joinFr(titles)}${commonGenres.length ? ` : ${joinFr(commonGenres)}` : ""}`;

    out.push({ entry: c, score, reason, because: titles });
  }

  return out.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, "fr")).slice(0, limit);
}

// ─────────────────────────────────────────
// Simple filters for the catalogue browser
// ─────────────────────────────────────────

export type LengthFilter = "court" | "moyen" | "long";

export type DiscoveryFilters = {
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
  if (f.genre && !c.genres.includes(f.genre)) return false;
  if (f.maxAge != null && (c.audience_min_age == null || c.audience_min_age > f.maxAge)) return false;
  if (f.status === "completed" && c.status !== "completed") return false;
  if (f.status === "ongoing" && c.status === "completed") return false;
  if (f.length && lengthOf(c.total_volumes) !== f.length) return false;
  return true;
}
