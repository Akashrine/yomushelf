import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAuthorizedCron } from "@/lib/server/cron-auth";
import { cleanThumbnail, searchBooks } from "@/lib/manga-api/google-books";
import { cacheVolumeCoverToStorage } from "@/lib/manga-api/storage";
import { runVolumeCovers, volumeCoversMode, type TargetSeries } from "@/lib/catalogue/volume-covers";
import type { Database } from "@/lib/types/database";

// Vercel Cron — nightly at 04:00 UTC (vercel.json). Fills volume ISBNs and
// covers for the series in readers' libraries, a little more each night.
// Disabled unless VOLUME_COVERS_MODE is "dry_run" or "on" ; an authorised
// call may add ?mode=dry_run to see what it would write.
export const maxDuration = 300;

const LIMITS = { maxWrites: 300, deadlineMs: 240_000, pagesPerQuery: 4 };
const PAUSE_MS = 1500; // Google Books rate-limits bursts with 503s

async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const mode = volumeCoversMode(process.env.VOLUME_COVERS_MODE, request.nextUrl.searchParams.get("mode"));
  if (mode === "off") {
    return NextResponse.json({ mode, message: "Jaquettes des tomes désactivées (VOLUME_COVERS_MODE)." });
  }

  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Shared series that at least one reader has, with a known length.
  async function targets(): Promise<TargetSeries[]> {
    const { data: shelves, error } = await supabase.from("user_collections").select("manga_id");
    if (error) throw error;
    const ids = [...new Set((shelves ?? []).map((s) => s.manga_id))];
    if (!ids.length) return [];
    const { data: mangas, error: mangasError } = await supabase
      .from("mangas")
      .select("id, title, publisher_fr, total_volumes")
      .in("id", ids)
      .is("created_by", null)
      .is("merged_into", null)
      .not("total_volumes", "is", null);
    if (mangasError) throw mangasError;
    const { data: known, error: knownError } = await supabase
      .from("volumes")
      .select("manga_id, volume_number")
      .in("manga_id", ids)
      .not("cover_url", "is", null);
    if (knownError) throw knownError;
    return (mangas ?? [])
      .map((m) => ({
        id: m.id,
        title: m.title,
        publisher: m.publisher_fr,
        total: m.total_volumes!,
        known: new Set((known ?? []).filter((k) => k.manga_id === m.id).map((k) => k.volume_number)),
      }))
      .sort((a, b) => a.known.size / a.total - b.known.size / b.total); // least covered first
  }

  try {
    const report = await runVolumeCovers(
      mode,
      {
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
        pause: () => new Promise((r) => setTimeout(r, PAUSE_MS)),
      },
      LIMITS
    );
    return NextResponse.json({ ...report, timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Impossible de compléter les tomes." }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
