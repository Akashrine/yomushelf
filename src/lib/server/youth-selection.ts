import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { minorMayAdd } from "@/lib/discovery/minor-catalogue";

type Supabase = SupabaseClient<Database>;

// Who follows the youth selection : everyone but a reader who said "15 and
// over". A reader who has not answered yet is restricted too (fail closed) ;
// null means the profile could not be read, which callers treat as a
// refusal. The database enforces the same rule on the shelf tables
// (migration 20261025000500), this is the clear message and the filter.
export async function mustFollowYouthSelection(supabase: Supabase, userId: string): Promise<boolean | null> {
  const { data, error } = await supabase.from("profiles").select("age_band").eq("id", userId).single();
  return error || !data ? null : data.age_band !== "15_plus";
}

// May this reader put this series on their shelf ? A series already there,
// one of their own personal series, or one with a verified age. Null : the
// check failed.
export async function mayHaveSeries(supabase: Supabase, userId: string, mangaId: string): Promise<boolean | null> {
  const [shelf, series] = await Promise.all([
    supabase.from("user_collections").select("manga_id").eq("user_id", userId).eq("manga_id", mangaId).maybeSingle(),
    supabase.from("mangas").select("created_by, audience_min_age, audience_age_source, audience_age_scope").eq("id", mangaId).maybeSingle(),
  ]);
  if (shelf.error || series.error) return null;
  if (shelf.data) return true;
  if (!series.data) return false;
  return series.data.created_by === userId || minorMayAdd(series.data);
}
