// Typed query helpers that bypass postgrest-js select-parser issues
// with non-JSON array columns (number[]).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type CollectionRow = Database["public"]["Tables"]["user_collections"]["Row"];
type Supabase = SupabaseClient<Database>;

export async function getUserCollection(
  supabase: Supabase,
  userId: string,
  mangaId: string
): Promise<CollectionRow | null> {
  const result = await supabase
    .from("user_collections")
    .select("*")
    .eq("user_id", userId)
    .eq("manga_id", mangaId)
    .maybeSingle();
  if (result.error) throw new Error("Impossible de charger cette série.");
  return (result as { data: CollectionRow | null }).data;
}

export const OWNED_VOLUME_COLUMNS =
  "manga_id, volume_number, price_eur, acquisition_type, acquired_at";

type OwnedVolumeRow = Pick<
  Database["public"]["Tables"]["user_volumes"]["Row"],
  "manga_id" | "volume_number" | "price_eur" | "acquisition_type" | "acquired_at"
>;

// All volumes of a user, optionally for one series. RLS scopes to the caller.
export async function getOwnedVolumes(
  supabase: Supabase,
  userId: string,
  mangaId?: string
): Promise<OwnedVolumeRow[]> {
  let query = supabase
    .from("user_volumes")
    .select(OWNED_VOLUME_COLUMNS)
    .eq("user_id", userId)
    .order("volume_number");
  if (mangaId) query = query.eq("manga_id", mangaId);
  const { data, error } = await query;
  if (error) throw new Error("Impossible de charger les tomes.");
  // numeric columns come back as strings from PostgREST
  return (data ?? []).map((v) => ({
    ...v,
    price_eur: v.price_eur == null ? null : Number(v.price_eur),
  }));
}

type ReadingRow = Pick<
  Database["public"]["Tables"]["user_readings"]["Row"],
  "manga_id" | "volume_number" | "status" | "finished_on"
>;

// Readings are independent from ownership : they outlive a returned volume.
export async function getReadings(
  supabase: Supabase,
  userId: string,
  mangaId?: string
): Promise<ReadingRow[]> {
  let query = supabase
    .from("user_readings")
    .select("manga_id, volume_number, status, finished_on")
    .eq("user_id", userId)
    .order("volume_number");
  if (mangaId) query = query.eq("manga_id", mangaId);
  const { data, error } = await query;
  if (error) throw new Error("Impossible de charger les lectures.");
  return data ?? [];
}

export type SeriesMetaRow = {
  manga_id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  author: string | null;
  total_volumes: number | null;
  status: "ongoing" | "completed" | "paused";
  genres: string[];
  demographic: Database["public"]["Tables"]["mangas"]["Row"]["demographic"];
  audience_min_age: number | null;
  avg_price_eur: number;
  is_private: boolean;
  archived_at: string | null;
  first_added_at: string;
};

const SERIES_META_SELECT =
  "manga_id, archived_at, first_added_at, mangas ( title, cover_url, author, total_volumes, status, genres, demographic, audience_min_age, avg_price_eur, created_by )";

// The user's series with the bits every reader screen needs.
// Archived series are left out unless asked for : they are off the shelf,
// but their readings still count wherever readings are counted.
export async function getSeriesMeta(
  supabase: Supabase,
  userId: string,
  { includeArchived = false }: { includeArchived?: boolean } = {}
): Promise<SeriesMetaRow[]> {
  let query = supabase.from("user_collections").select(SERIES_META_SELECT).eq("user_id", userId);
  if (!includeArchived) query = query.is("archived_at", null);
  const { data, error } = await query;
  if (error) throw new Error("Impossible de charger les séries.");
  return (data ?? []).map((row) => {
    const m = row.mangas as unknown as {
      title: string;
      cover_url: string | null;
      author: string | null;
      total_volumes: number | null;
      status: "ongoing" | "completed" | "paused";
      genres: string[] | null;
      demographic: SeriesMetaRow["demographic"];
      audience_min_age: number | null;
      avg_price_eur: number | string | null;
      created_by: string | null;
    } | null;
    return {
      manga_id: row.manga_id,
      title: m?.title ?? "Série",
      slug: row.manga_id, // series pages are addressed by manga id
      cover_url: m?.cover_url ?? null,
      author: m?.author ?? null,
      total_volumes: m?.total_volumes ?? null,
      status: m?.status ?? "ongoing",
      genres: m?.genres ?? [],
      demographic: m?.demographic ?? null,
      audience_min_age: m?.audience_min_age ?? null,
      avg_price_eur: m?.avg_price_eur == null ? 7.5 : Number(m.avg_price_eur),
      is_private: m?.created_by != null,
      archived_at: row.archived_at,
      first_added_at: row.first_added_at,
    };
  });
}
