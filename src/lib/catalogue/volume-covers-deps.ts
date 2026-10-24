import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { cleanThumbnail, searchBooks } from "@/lib/manga-api/google-books";
import { cacheVolumeCoverToStorage } from "@/lib/manga-api/storage";
import type { TargetSeries, VolumeCoversDeps } from "./volume-covers";

// The real providers behind runVolumeCovers : Google Books, the covers
// bucket, the volumes table (service role). Shared by the nightly job and
// the fill a series page asks for when it is viewed.
export function volumeCoversDeps(
  supabase: SupabaseClient<Database>,
  targets: () => Promise<TargetSeries[]>,
  pauseMs: number
): VolumeCoversDeps {
  return {
    targets,
    search: searchBooks,
    cacheCover: (url, isbn) => cacheVolumeCoverToStorage(cleanThumbnail(url), isbn),
    async insert(row) {
      const { error } = await supabase.from("volumes").insert({ ...row, edition: "standard" });
      if (!error) return "inserted";
      if (error.code === "23505") return "duplicate"; // ISBN or volume already known
      throw error;
    },
    now: () => Date.now(),
    pause: () => new Promise((r) => setTimeout(r, pauseMs)),
  };
}
