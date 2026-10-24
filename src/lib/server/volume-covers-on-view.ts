import { serviceClient } from "@/lib/server/consent";
import { runVolumeCovers, volumeCoversMode } from "@/lib/catalogue/volume-covers";
import { volumeCoversDeps } from "@/lib/catalogue/volume-covers-deps";

const EVERY_MS = 6 * 3_600_000; // one Google Books round per series every 6 hours
const LIMITS = { maxWrites: 60, deadlineMs: 45_000, pagesPerQuery: 2 };

// Runs after a series page was sent (next/server `after`) : the volumes of
// this shared series with no cover yet, stored like the nightly job does.
// The next visit shows them. Same switch as the nightly job
// (VOLUME_COVERS_MODE). Never throws : a failed fill only means no new cover.
export async function fillVolumeCoversOnView(mangaId: string): Promise<void> {
  const mode = volumeCoversMode(process.env.VOLUME_COVERS_MODE, null);
  if (mode !== "on") return;
  try {
    const supabase = serviceClient();
    // Claim the round : only one view in 6 hours goes to Google Books.
    const since = new Date(Date.now() - EVERY_MS).toISOString();
    const { data: claimed, error } = await supabase
      .from("mangas")
      .update({ volume_covers_checked_at: new Date().toISOString() })
      .eq("id", mangaId)
      .is("created_by", null)
      .is("merged_into", null)
      .not("total_volumes", "is", null)
      .or(`volume_covers_checked_at.is.null,volume_covers_checked_at.lt.${since}`)
      .select("id, title, publisher_fr, total_volumes")
      .maybeSingle();
    if (error || !claimed) return;
    const { data: known, error: knownError } = await supabase.from("volumes").select("volume_number").eq("manga_id", mangaId).not("cover_url", "is", null);
    if (knownError) return;
    const target = {
      id: claimed.id,
      title: claimed.title,
      publisher: claimed.publisher_fr,
      total: claimed.total_volumes!,
      known: new Set((known ?? []).map((k) => k.volume_number)),
    };
    await runVolumeCovers(mode, volumeCoversDeps(supabase, async () => [target], 800), LIMITS);
  } catch (e) {
    console.error("volume covers on view", e instanceof Error ? e.message : e);
  }
}
