import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { searchMangaMAL } from "@/lib/manga-api/mal";

const SearchSchema = z.object({
  q: z.string().min(1).max(100).trim(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const parsed = SearchSchema.safeParse({
    q: searchParams.get("q"),
    limit: searchParams.get("limit") ?? 10,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Paramètre q requis." },
      { status: 400 }
    );
  }

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { q, limit } = parsed.data;

  // 1. Search local DB first (fast, free)
  const { data: localResults } = await supabase
    .from("mangas")
    .select(
      "id, title, author, publisher_fr, total_volumes, status, avg_price_eur, genre_primary, cover_url, external_ids"
    )
    .ilike("title", `%${q}%`)
    .limit(limit);

  if (localResults && localResults.length >= 3) {
    return NextResponse.json({ results: localResults, source: "db" });
  }

  // 2. MAL API fallback
  try {
    const malResults = await searchMangaMAL(q, limit);
    return NextResponse.json({ results: malResults, source: "mal" });
  } catch {
    // MAL unavailable — return whatever we have from DB
    return NextResponse.json({
      results: localResults ?? [],
      source: "db",
    });
  }
}
