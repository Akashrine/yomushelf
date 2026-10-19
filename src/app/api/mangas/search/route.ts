import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/supabase/session";
import { searchMangaMAL } from "@/lib/manga-api/mal";
import { mergeSearchResults, type SearchHit } from "@/lib/manga-api/merge";
import { consumeImportQuota } from "@/lib/rate-limit/import-quota";

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

  const { supabase, user } = await getSessionUser();
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

  // What the reader already has, so the add flow starts from it.
  if (localHits.length) {
    const ids = localHits.map((h) => h.id as string);
    const [{ data: vols }, { data: reads }] = await Promise.all([
      supabase.from("user_volumes").select("manga_id, volume_number").eq("user_id", user.id).in("manga_id", ids),
      supabase.from("user_readings").select("manga_id, volume_number").eq("user_id", user.id).eq("status", "read").in("manga_id", ids),
    ]);
    for (const h of localHits) {
      h.owned = (vols ?? []).filter((v) => v.manga_id === h.id).map((v) => v.volume_number);
      h.read = (reads ?? []).filter((r) => r.manga_id === h.id).map((r) => r.volume_number);
    }
  }

  let remote: SearchHit[] = [];
  let remoteError = false;
  if (localHits.length < 5) {
    // Aliases ("Shingeki no Kyojin" for "L'Attaque des Titans") keep a
    // known series from coming back under its original title.
    if (localHits.length) {
      const { data: aliasRows } = await supabase
        .from("mangas")
        .select("id, aliases")
        .in("id", localHits.map((h) => h.id as string));
      const aliases = new Map((aliasRows ?? []).map((r) => [r.id, r.aliases ?? []]));
      for (const h of localHits) h.alt_titles = aliases.get(h.id as string) ?? [];
    }
    if (!(await consumeImportQuota(user.id, "remote_search"))) {
      // Over the limit : local results only, said honestly in the UI.
      return NextResponse.json({ results: localHits, remote_unavailable: true });
    }
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
        alt_titles: r.title_fr ? [r.title_fr] : [],
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
