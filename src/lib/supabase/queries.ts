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
  const { data } = await query;
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
  const { data } = await query;
  return data ?? [];
}

export type SeriesMetaRow = {
  manga_id: string;
  title: string;
  slug: string;
  cover_url: string | null;
};

// The user's series with the bits every reader screen needs.
export async function getSeriesMeta(supabase: Supabase, userId: string): Promise<SeriesMetaRow[]> {
  const { data } = await supabase
    .from("user_collections")
    .select("manga_id, mangas ( title, cover_url )")
    .eq("user_id", userId);
  return (data ?? []).map((row) => {
    const m = row.mangas as unknown as { title: string; cover_url: string | null } | null;
    return {
      manga_id: row.manga_id,
      title: m?.title ?? "Série",
      slug: row.manga_id, // series pages are addressed by manga id
      cover_url: m?.cover_url ?? null,
    };
  });
}
