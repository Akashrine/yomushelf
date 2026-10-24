import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { CatalogueEntry, DeclaredTastes, DiscoveryScope, Neighbours, ReaderSeries } from "@/lib/discovery/suggest";
import type { SeriesMetaRow } from "./queries";
import type { OwnedVolume } from "@/lib/collection/value";
import type { Reading } from "@/lib/collection/reading";

type Supabase = SupabaseClient<Database>;

const CATALOGUE_SELECT =
  "id, title, author, genres, demographic, audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_year, total_volumes, status, top_50_rank, cover_url";

export type DiscoveryContext = {
  catalogue: CatalogueEntry[]; // curated shared series only
  dismissed: Set<string>;
  wished: string[];
  declared: DeclaredTastes;
  scope: DiscoveryScope;
  scopeLocked: boolean; // under 15 : the youth selection, set with the parent's consent
};

// What discovery may propose : editorial (curated) shared series, never a
// private entry nor a raw import. Errors throw : the page shows its error
// screen instead of an empty discovery.
export async function loadDiscoveryContext(supabase: Supabase, userId: string): Promise<DiscoveryContext> {
  const [catalogue, dismissals, wishes, profile] = await Promise.all([
    supabase.from("mangas").select(CATALOGUE_SELECT).is("created_by", null).is("merged_into", null).eq("curated", true),
    supabase.from("discovery_dismissals").select("manga_id").eq("user_id", userId),
    supabase.from("wishlist_items").select("manga_id").eq("user_id", userId),
    supabase.from("profiles").select("liked_genres, avoided_genres, discovery_scope, age_band").eq("id", userId).single(),
  ]);
  if (catalogue.error || dismissals.error || wishes.error || profile.error) {
    throw new Error("Impossible de charger les découvertes.");
  }
  return {
    catalogue: (catalogue.data ?? []).map((m) => ({ ...m, genres: m.genres ?? [] })),
    dismissed: new Set((dismissals.data ?? []).map((d) => d.manga_id)),
    wished: [...new Set((wishes.data ?? []).map((w) => w.manga_id))],
    declared: { liked: profile.data?.liked_genres ?? [], avoided: profile.data?.avoided_genres ?? [] },
    scope: profile.data?.discovery_scope === "youth_verified" ? "youth_verified" : "all",
    scopeLocked: profile.data?.age_band === "under_15",
  };
}

// The reader's series as discovery sees them, archived ones included.
export function readerLibrary(series: SeriesMetaRow[], volumes: OwnedVolume[], readings: Reading[]): ReaderSeries[] {
  return series.map((s) => ({
    manga_id: s.manga_id,
    title: s.title,
    read: readings.filter((r) => r.manga_id === s.manga_id && r.status === "read").length,
    owned: volumes.filter((v) => v.manga_id === s.manga_id).length,
    liked: s.liked,
  }));
}

// Catalogue view of the reader's own series (for taste), merged with the
// curated catalogue : a private or imported series still counts if it has
// genres.
export function withReaderSeries(catalogue: CatalogueEntry[], series: SeriesMetaRow[]): Map<string, CatalogueEntry> {
  const map = new Map(catalogue.map((c) => [c.id, c]));
  for (const s of series) {
    if (map.has(s.manga_id)) continue;
    map.set(s.manga_id, {
      id: s.manga_id,
      title: s.title,
      author: s.author,
      genres: s.genres,
      demographic: s.demographic,
      audience_min_age: s.audience_min_age,
      audience_age_source: s.audience_age_source,
      total_volumes: s.total_volumes,
      status: s.status,
      top_50_rank: null,
      cover_url: s.cover_url,
    });
  }
  return map;
}

// Closest series of the given ones (series_neighbours). Optional : a
// failure only means suggestions without this signal.
export async function loadNeighbours(supabase: Supabase, ids: string[]): Promise<Neighbours> {
  const out: Neighbours = new Map();
  if (ids.length === 0) return out;
  const { data, error } = await supabase.from("series_neighbours").select("manga_id, neighbour_id, rank").in("manga_id", ids).order("rank");
  if (error) return out;
  for (const r of data ?? []) {
    const list = out.get(r.manga_id) ?? [];
    list.push({ id: r.neighbour_id, rank: r.rank });
    out.set(r.manga_id, list);
  }
  return out;
}
