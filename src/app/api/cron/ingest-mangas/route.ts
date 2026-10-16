import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAuthorizedCron } from "@/lib/server/cron-auth";
import { getMangaRankingMAL } from "@/lib/manga-api/mal";
import { cacheCoverToStorage } from "@/lib/manga-api/storage";
import { ingestMode, runIngest, type IngestRepo } from "@/lib/catalogue/ingest";
import type { Database } from "@/lib/types/database";

// Vercel Cron — nightly at 03:00 UTC (vercel.json). Vercel calls with GET.
// Disabled unless CRON_INGEST_MODE is "dry_run" or "on" ; any authorised
// call may add ?mode=dry_run to see the plan without writing anything.
export const maxDuration = 300; // 5 min

const LIMITS = {
  maxWrites: Number(process.env.CRON_INGEST_MAX_WRITES ?? 20),
  maxCovers: Number(process.env.CRON_INGEST_MAX_COVERS ?? 20),
  deadlineMs: 240_000,
};

async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const mode = ingestMode(process.env.CRON_INGEST_MODE, request.nextUrl.searchParams.get("mode"));
  if (mode === "off") {
    return NextResponse.json({ mode, message: "Import désactivé (CRON_INGEST_MODE)." });
  }

  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const repo: IngestRepo = {
    async findByMalId(malId) {
      const { data, error } = await supabase
        .from("mangas")
        .select("id, updated_at, cover_url, curated, external_ids")
        .contains("external_ids", { mal_id: malId })
        .is("created_by", null)
        .is("merged_into", null)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? { ...data, external_ids: (data.external_ids ?? {}) as Record<string, unknown> } : null;
    },
    async namesLike(names) {
      const out: { title: string; aliases: string[] }[] = [];
      for (const name of names) {
        const { data: hits, error } = await supabase.rpc("search_mangas", { p_query: name, p_limit: 10 });
        if (error) throw error;
        if (!hits?.length) continue;
        const { data: rows, error: rowsError } = await supabase
          .from("mangas")
          .select("title, aliases")
          .in("id", hits.map((h) => h.id))
          .is("created_by", null);
        if (rowsError) throw rowsError;
        out.push(...(rows ?? []).map((r) => ({ title: r.title, aliases: r.aliases ?? [] })));
      }
      return out;
    },
    async insert(row) {
      const { error } = await supabase.from("mangas").insert(row as Database["public"]["Tables"]["mangas"]["Insert"]);
      if (error) throw error;
    },
    async update(id, row) {
      const { error } = await supabase.from("mangas").update(row as Database["public"]["Tables"]["mangas"]["Update"]).eq("id", id);
      if (error) throw error;
    },
  };

  try {
    const report = await runIngest(
      mode,
      {
        ranking: () => getMangaRankingMAL(200),
        repo,
        cacheCover: cacheCoverToStorage,
        newId: () => crypto.randomUUID(),
        now: () => Date.now(),
      },
      LIMITS
    );
    return NextResponse.json({ ...report, timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Le classement MyAnimeList ne répond pas." }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
