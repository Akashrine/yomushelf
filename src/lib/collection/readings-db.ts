// Server-side reading writes shared by several Server Actions.
// One row per (user, series, volume) : every write is idempotent.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ReadingStatus } from "@/lib/types/database";

type Supabase = SupabaseClient<Database>;

export type ReadingState = { status: ReadingStatus; finished_on: string | null } | null;

type Ref = { userId: string; mangaId: string; volumeNumber: number };

export async function getReadingState(supabase: Supabase, ref: Ref): Promise<ReadingState> {
  const { data, error } = await supabase
    .from("user_readings")
    .select("status, finished_on")
    .eq("user_id", ref.userId)
    .eq("manga_id", ref.mangaId)
    .eq("volume_number", ref.volumeNumber)
    .maybeSingle();
  if (error) throw new Error("Impossible de vérifier cette lecture.");
  return data ?? null;
}

// Puts a volume's reading in exactly this state (null = no reading).
export async function setReadingState(supabase: Supabase, ref: Ref, state: ReadingState) {
  if (state == null) {
    return supabase
      .from("user_readings")
      .delete()
      .eq("user_id", ref.userId)
      .eq("manga_id", ref.mangaId)
      .eq("volume_number", ref.volumeNumber);
  }
  return supabase.from("user_readings").upsert(
    {
      user_id: ref.userId,
      manga_id: ref.mangaId,
      volume_number: ref.volumeNumber,
      status: state.status,
      finished_on: state.status === "read" ? state.finished_on : null,
    },
    { onConflict: "user_id,manga_id,volume_number" }
  );
}

export async function countVolumesRead(supabase: Supabase, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("user_readings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "read");
  if (error || count == null) throw new Error("Impossible de compter les lectures.");
  return count;
}
