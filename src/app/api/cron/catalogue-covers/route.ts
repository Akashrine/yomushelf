import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAuthorizedCron } from "@/lib/server/cron-auth";
import { cleanThumbnail, searchBooks } from "@/lib/manga-api/google-books";
import { getMangaByIdMAL } from "@/lib/manga-api/mal";
import { cacheCoverToStorage } from "@/lib/manga-api/storage";
import { pickVolumes } from "@/lib/catalogue/volume-covers";
import { runCatalogueCovers, type CoverTarget } from "@/lib/catalogue/catalogue-covers";
import type { Database } from "@/lib/types/database";

// Vercel Cron — nightly at 04:45 UTC (vercel.json). Covers for the curated
// series that have none yet (lib/catalogue/catalogue-covers.ts).
export const maxDuration = 300;

const LIMITS = { maxSeries: 80, deadlineMs: 240_000 };
const PAUSE_MS = 600;

async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  async function targets(): Promise<CoverTarget[]> {
    const { data, error } = await supabase
      .from("mangas")
      .select("id, title, total_volumes, external_ids")
      .is("created_by", null)
      .is("merged_into", null)
      .eq("curated", true)
      .is("cover_url", null)
      .order("created_at");
    if (error) throw error;
    // Exact MyAnimeList ids first : one fast call each. The Google Books
    // fallback is slow (it retries its random 503s).
    return (data ?? [])
      .map((m) => {
        const mal = Number((m.external_ids as { mal_id?: unknown } | null)?.mal_id);
        return { id: m.id, title: m.title, total: m.total_volumes, malId: Number.isInteger(mal) && mal > 0 ? mal : null };
      })
      .sort((a, b) => Number(b.malId != null) - Number(a.malId != null));
  }

  try {
    const report = await runCatalogueCovers(
      {
        targets,
        async malCover(malId) {
          const found = await getMangaByIdMAL(malId);
          if (!found) return null;
          return "refused" in found ? "refused" : found.cover_url;
        },
        async bookCover(title, total) {
          const items = await searchBooks(`${title} tome 1`, 0);
          const first = items ? pickVolumes(items, { title, total: total ?? 500 }).get(1) : undefined;
          return first ? cleanThumbnail(first.thumbnail) : null;
        },
        cache: cacheCoverToStorage,
        async save(id, coverUrl) {
          const { error } = await supabase.from("mangas").update({ cover_url: coverUrl }).eq("id", id).is("cover_url", null);
          if (error) throw error;
        },
        now: () => Date.now(),
        pause: () => new Promise((r) => setTimeout(r, PAUSE_MS)),
      },
      LIMITS
    );
    return NextResponse.json({ ...report, timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Impossible de compléter les couvertures du catalogue." }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
