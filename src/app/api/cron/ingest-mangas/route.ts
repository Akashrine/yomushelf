import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMangaRankingMAL } from "@/lib/manga-api/mal";
import { cacheCoverToStorage } from "@/lib/manga-api/storage";
import type { Database } from "@/lib/types/database";

// Vercel Cron — runs nightly at 03:00 UTC (see vercel.json)
export const maxDuration = 300; // 5 min

export async function POST(request: NextRequest) {
  const secret = request.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let upserted = 0;
  let errors = 0;

  try {
    const mangas = await getMangaRankingMAL(200);

    for (const manga of mangas) {
      try {
        const malId = manga.external_ids.mal_id;

        // Skip if already exists and was updated recently (24h)
        const { data: existing } = await supabase
          .from("mangas")
          .select("id, updated_at, cover_url")
          .contains("external_ids", { mal_id: malId })
          .single();

        if (existing) {
          const updatedAt = new Date(existing.updated_at);
          const age = Date.now() - updatedAt.getTime();
          if (age < 86400_000) continue; // skip if fresh
        }

        // Cache cover
        let cover_url = existing?.cover_url ?? null;
        if (manga.cover_url && !cover_url) {
          const mangaId = existing?.id ?? crypto.randomUUID();
          cover_url = await cacheCoverToStorage(manga.cover_url, mangaId);
        }

        const payload: Database["public"]["Tables"]["mangas"]["Insert"] = {
          title: manga.title,
          author: manga.author,
          publisher_fr: manga.publisher_fr,
          total_volumes: manga.total_volumes,
          status: manga.status,
          avg_price_eur: manga.avg_price_eur,
          genre_primary: manga.genre_primary,
          cover_url,
          external_ids: { mal_id: malId } as Record<string, number>,
          is_top_50_fr: false,
        };

        if (existing) {
          await supabase.from("mangas").update(payload).eq("id", existing.id);
        } else {
          await supabase.from("mangas").insert(payload);
        }

        upserted++;
      } catch {
        errors++;
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: "MAL API unavailable", detail: String(err) },
      { status: 502 }
    );
  }

  return NextResponse.json({ upserted, errors, timestamp: new Date().toISOString() });
}
