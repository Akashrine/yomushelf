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

export async function updateCollectionVolumes(
  supabase: Supabase,
  collectionId: string,
  ownedVolumes: number[]
): Promise<{ error: { message: string } | null }> {
  const result = await supabase
    .from("user_collections")
    .update({ owned_volumes: ownedVolumes } as Database["public"]["Tables"]["user_collections"]["Update"])
    .eq("id", collectionId);
  return result as { error: { message: string } | null };
}
