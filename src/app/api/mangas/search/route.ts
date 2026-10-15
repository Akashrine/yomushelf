import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { searchMangaMAL } from "@/lib/manga-api/mal";
import { mergeSearchResults, type SearchHit } from "@/lib/manga-api/merge";

const SearchSchema = z.object({
  q: z.string().min(1).max(100).trim(),
  limit: z.coerce.number().int().min(1).max(20).default(12),
});

// Catalogue first (tolerant to accents, typos and kid spellings, the
// reader's private series included), MyAnimeList only to complete a
// short list. Duplicates are removed : a series already in the catalogue
// is never offered a second time from MyAnimeList.
export async function GET(request: NextRequest) {
  const parsed = SearchSchema.safeParse({
    q: request.nextUrl.searchParams.get("q"),
    limit: request.nextUrl.searchParams.get("limit") ?? 12,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Paramètre q requis." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { q, limit } = parsed.data;
  const { data: local, error } = await supabase.rpc("search_mangas", { p_query: q, p_limit: limit });
  if (error) {
    return NextResponse.json({ error: "La recherche ne répond pas. Réessaie." }, { status: 502 });
  }

  const localHits: SearchHit[] = (local ?? []).map((m) => ({
    source: m.is_private ? "private" : "db",
    id: m.id,
    title: m.title,
    author: m.author,
    total_volumes: m.total_volumes,
    status: m.status,
    cover_url: m.cover_url,
    genres: m.genres,
    mal_id: typeof (m.external_ids as { mal_id?: unknown })?.mal_id === "number"
      ? ((m.external_ids as { mal_id: number }).mal_id)
      : null,
  }));

  let remote: SearchHit[] = [];
  let remoteError = false;
  if (localHits.length < 5) {
    try {
      remote = (await searchMangaMAL(q, limit)).map((r) => ({
        source: "mal",
        id: null,
        title: r.title,
        author: r.author,
        total_volumes: r.total_volumes,
        status: r.status,
        cover_url: r.cover_url,
        genres: [],
        mal_id: r.external_ids.mal_id ?? null,
      }));
    } catch {
      remoteError = true;
    }
  }

  return NextResponse.json({
    results: mergeSearchResults(localHits, remote, limit),
    remote_unavailable: remoteError,
  });
}
