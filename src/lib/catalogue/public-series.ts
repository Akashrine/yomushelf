import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { ageLabel, GENRE_LABELS, type CatalogueEntry } from "@/lib/discovery/suggest";

// Public series pages (/serie/[slug]) : the curated shared catalogue read
// with an anonymous client, no cookies, so the pages stay static. The slug
// is derived from the title : no column to migrate, stable as long as the
// title is.

export type PublicSeries = CatalogueEntry & {
  slug: string;
  publisher_fr: string | null;
  list_price_eur: number | null;
  synopsis: string | null;
};

export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Among rows sharing a title, the most complete one : verified age, then
// ranked, then with a synopsis.
function completeness(m: PublicSeries): number {
  return (m.audience_age_source === "cnlj" ? 4 : 0) + (m.top_50_rank ? 2 : 0) + (m.synopsis ? 1 : 0);
}

export function dedupeBySlug(rows: PublicSeries[]): PublicSeries[] {
  const bySlug = new Map<string, PublicSeries>();
  for (const m of rows) {
    if (!m.slug) continue;
    const kept = bySlug.get(m.slug);
    if (!kept || completeness(m) > completeness(kept)) bySlug.set(m.slug, m);
  }
  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

const SELECT =
  "id, title, author, genres, demographic, audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_year, total_volumes, status, top_50_rank, cover_url, publisher_fr, list_price_eur, synopsis";

// Empty without Supabase settings (a preview build without its variables) :
// the pages then simply do not exist instead of failing the deployment.
export async function loadPublicSeries(): Promise<PublicSeries[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.from("mangas").select(SELECT).is("created_by", null).is("merged_into", null).eq("curated", true);
  if (error || !data) return [];
  return dedupeBySlug(data.map((m) => ({ ...m, genres: m.genres ?? [], slug: slugify(m.title) })));
}

export async function loadNeighbourSlugs(seriesId: string, all: PublicSeries[]): Promise<PublicSeries[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
  const { data } = await supabase.from("series_neighbours").select("neighbour_id").eq("manga_id", seriesId).order("rank").limit(8);
  const byId = new Map(all.map((s) => [s.id, s]));
  return (data ?? []).flatMap((n) => byId.get(n.neighbour_id) ?? []).slice(0, 4);
}

// A plain description from real data only : nothing is invented.
export function seriesDescription(s: PublicSeries): string {
  const parts: string[] = [];
  const meta = [s.author, s.publisher_fr].filter(Boolean).join(", ");
  parts.push(meta ? `${s.title} : manga de ${meta}.` : `${s.title} : manga.`);
  if (s.total_volumes) parts.push(`${s.total_volumes} tomes${s.status === "completed" ? ", série terminée" : ""}.`);
  if (s.audience_age_source === "cnlj" && s.audience_min_age != null) parts.push(`Âge conseillé : ${ageLabel(s)}.`);
  const genres = s.genres.map((g) => GENRE_LABELS[g] ?? g).slice(0, 3);
  if (genres.length) parts.push(`Genres : ${genres.join(", ")}.`);
  return parts.join(" ");
}
