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
  // Without the MyAnimeList key every series would only be "unanswered".
  if (!process.env.MAL_CLIENT_ID) {
    return NextResponse.json({ error: "MAL_CLIENT_ID manquant : couvertures du catalogue non cherchées." }, { status: 500 });
  }
  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  async function targets(): Promise<CoverTarget[]> {
    const { data, error } = await supabase
      .from("mangas")
      .select("id, title, total_volumes, publisher_fr, external_ids")
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
        return { id: m.id, title: m.title, total: m.total_volumes, publisher: m.publisher_fr, malId: Number.isInteger(mal) && mal > 0 ? mal : null };
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
        async bookCover({ title, total, publisher }) {
          // Same French publisher as the catalogue says : a short title alone
          // could match another book's volume 1.
          if (!publisher) return null;
          const items = await searchBooks(`${title} tome 1`, 0);
          const own = (items ?? []).filter((i) => i.publisher && samePublisher(i.publisher, publisher));
          const first = pickVolumes(own, { title, total: total ?? 500 }).get(1);
          // zoom=0 : the largest image Google Books has, not the 128 px thumbnail
          return first ? cleanThumbnail(first.thumbnail).replace(/([?&])zoom=\d/, "$1zoom=0") : null;
        },
        cache: cacheCoverToStorage,
        async save(id, coverUrl) {
          const { data, error } = await supabase.from("mangas").update({ cover_url: coverUrl }).eq("id", id).is("cover_url", null).select("id");
          if (error) throw error;
          return (data ?? []).length > 0;
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

// "Éditions Glénat" / "Glénat Manga" / "glenat" : the same publisher.
const STOP = new Set(["editions", "edition", "manga", "mangas", "les", "ed"]);
const publisherWords = (p: string) =>
  p.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w));
function samePublisher(found: string, expected: string): boolean {
  const want = publisherWords(expected);
  const got = new Set(publisherWords(found));
  return want.length > 0 && want.some((w) => got.has(w));
}
