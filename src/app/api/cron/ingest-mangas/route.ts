import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/server/cron-auth";
import { createClient } from "@supabase/supabase-js";
import { getMangaRankingMAL } from "@/lib/manga-api/mal";
import { cacheCoverToStorage } from "@/lib/manga-api/storage";
import { titleKey } from "@/lib/manga-api/merge";
import type { Database } from "@/lib/types/database";

// Vercel Cron — runs nightly at 03:00 UTC (see vercel.json)
export const maxDuration = 300; // 5 min

export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
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
          .select("id, updated_at, cover_url, curated, title, aliases")
          .contains("external_ids", { mal_id: malId })
          .is("created_by", null)
          .limit(1)
          .maybeSingle();

        // Editorial rows keep their French title and data : at most the
        // missing cover is filled in.
        if (existing?.curated) {
          if (!existing.cover_url && manga.cover_url) {
            const cover = await cacheCoverToStorage(manga.cover_url, existing.id);
            if (cover) await supabase.from("mangas").update({ cover_url: cover }).eq("id", existing.id);
          }
          continue;
        }

        // Not known by its MyAnimeList id : never insert a second copy of a
        // series already in the catalogue under the same title or alias.
        if (!existing) {
          const keys = [manga.title, manga.title_fr].filter((t): t is string => Boolean(t)).map(titleKey);
          const { data: sameTitle } = await supabase
            .from("mangas")
            .select("id, title, aliases")
            .is("created_by", null)
            .is("merged_into", null)
            .ilike("title", manga.title.replace(/[%_]/g, "").slice(0, 3) + "%")
            .limit(50);
          const { data: byAlias } = await supabase
            .from("mangas")
            .select("id, title, aliases")
            .is("created_by", null)
            .is("merged_into", null)
            .overlaps("aliases", [manga.title.toLowerCase(), ...(manga.title_fr ? [manga.title_fr.toLowerCase()] : [])]);
          const known = [...(sameTitle ?? []), ...(byAlias ?? [])].some((r) =>
            [r.title, ...(r.aliases ?? [])].some((t) => keys.includes(titleKey(t)))
          );
          if (known) continue;
        }

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
