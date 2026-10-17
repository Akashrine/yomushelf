import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAuthorizedCron } from "@/lib/server/cron-auth";
import { getMangaPicturesMAL, searchMangaMAL } from "@/lib/manga-api/mal";
import { cacheMangaPictureToStorage } from "@/lib/manga-api/storage";
import { RECHECK_DAYS, runMangaPictures, type PictureTarget } from "@/lib/catalogue/manga-pictures";
import type { Database } from "@/lib/types/database";

// Vercel Cron — nightly at 04:30 UTC (vercel.json). Fills "En images" for
// the curated catalogue, a few series a night, never-checked ones first.
export const maxDuration = 300;

const LIMITS = { maxSeries: 25, deadlineMs: 240_000 };
const PAUSE_MS = 800;

async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const recheckBefore = new Date(Date.now() - RECHECK_DAYS * 86_400_000).toISOString();

  async function targets(): Promise<PictureTarget[]> {
    const { data, error } = await supabase
      .from("mangas")
      .select("id, title, author, external_ids, pictures_checked_at")
      .is("created_by", null)
      .is("merged_into", null)
      .eq("curated", true)
      .or(`pictures_checked_at.is.null,pictures_checked_at.lt.${recheckBefore}`)
      .order("pictures_checked_at", { ascending: true, nullsFirst: true })
      .order("top_50_rank", { ascending: true, nullsFirst: false })
      .limit(LIMITS.maxSeries);
    if (error) throw error;
    return (data ?? []).map((m) => {
      const mal = (m.external_ids as { mal_id?: unknown } | null)?.mal_id;
      return { id: m.id, title: m.title, author: m.author, malId: typeof mal === "number" ? mal : null };
    });
  }

  try {
    const report = await runMangaPictures(
      {
        targets,
        search: (title) =>
          searchMangaMAL(title, 10)
            .then((hits) => hits.map((h) => ({ malId: Number(h.external_id), title: h.title, author: h.author })))
            .catch(() => null),
        pictures: getMangaPicturesMAL,
        cache: cacheMangaPictureToStorage,
        async save(mangaId, { pictures, malId }) {
          const { data: row } = await supabase.from("mangas").select("external_ids").eq("id", mangaId).single();
          const externalIds = { ...((row?.external_ids as Record<string, unknown> | null) ?? {}), ...(malId ? { mal_id: malId } : {}) };
          const { error } = await supabase
            .from("mangas")
            .update({ pictures_checked_at: new Date().toISOString(), external_ids: externalIds, ...(pictures ? { pictures } : {}) })
            .eq("id", mangaId);
          if (error) throw error;
        },
        now: () => Date.now(),
        pause: () => new Promise((r) => setTimeout(r, PAUSE_MS)),
      },
      LIMITS
    );
    return NextResponse.json({ ...report, timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Impossible de compléter les images." }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
