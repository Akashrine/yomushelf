import type { MALMangaNode, MangaSearchResult } from "./types";

const MAL_BASE = "https://api.myanimelist.net/v2";
const FIELDS =
  "id,title,main_picture,alternative_titles,status,num_volumes,genres,authors{first_name,last_name},serialization{name},nsfw,media_type";

// What may enter the shared catalogue from MyAnimeList. Two separate
// questions, each with its own reason (see docs/politique-contenu.md) :
// 1. Type of work (product scope) : comics read like manga (manga,
//    one-shot, manhwa, manhua). Novels, light novels and self-published
//    doujinshi are not what Yomushelf tracks. The country of origin is
//    never a reason to refuse.
// 2. Content signal (protection of the shared catalogue) : only entries
//    MyAnimeList flags "white" (no sexual content reported). "gray",
//    "black" or a missing flag are refused. A "white" flag does NOT mean
//    the series suits a child : imported rows get no age and stay out of
//    Découvrir until reviewed.
const COMIC_TYPES = new Set(["manga", "one_shot", "manhwa", "manhua", "oel"]);

export type ImportRefusal = "type" | "content";

export function malImportRefusal(node: Pick<MALMangaNode, "nsfw" | "media_type">): ImportRefusal | null {
  if (!COMIC_TYPES.has(node.media_type ?? "")) return "type";
  if (node.nsfw !== "white") return "content";
  return null;
}

export function isAllowedMalEntry(node: Pick<MALMangaNode, "nsfw" | "media_type">): boolean {
  return malImportRefusal(node) === null;
}

function getClientId(): string {
  const id = process.env.MAL_CLIENT_ID;
  if (!id) throw new Error("MAL_CLIENT_ID env var is not set");
  return id;
}

function malStatusToLocal(
  status?: MALMangaNode["status"]
): MangaSearchResult["status"] {
  switch (status) {
    case "finished":
      return "completed";
    case "on_hiatus":
    case "discontinued":
      return "paused";
    default:
      return "ongoing";
  }
}

function malGenreToFr(genres?: MALMangaNode["genres"]): string | null {
  if (!genres?.length) return null;
  const priority = ["Shounen", "Seinen", "Shoujo", "Josei", "Action", "Fantasy"];
  for (const p of priority) {
    const match = genres.find((g) => g.name === p);
    if (match) return match.name;
  }
  return genres[0].name;
}

export function normalizeMalManga(node: MALMangaNode): MangaSearchResult {
  const author = node.authors
    ?.filter((a) => a.role === "Story" || a.role === "Story & Art")
    .map((a) => `${a.node.last_name} ${a.node.first_name}`.trim())
    .join(", ") ?? null;

  return {
    source: "mal",
    external_id: String(node.id),
    title: node.title,
    title_fr: node.alternative_titles?.en ?? undefined,
    author: author || null,
    publisher_fr: null, // MAL doesn't have FR publisher data
    total_volumes: node.num_volumes ?? null,
    status: malStatusToLocal(node.status),
    avg_price_eur: 7.5,
    genre_primary: malGenreToFr(node.genres),
    cover_url: node.main_picture?.large ?? node.main_picture?.medium ?? null,
    external_ids: { mal_id: node.id },
  };
}

export async function searchMangaMAL(
  query: string,
  limit = 10
): Promise<MangaSearchResult[]> {
  const url = new URL(`${MAL_BASE}/manga`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(Math.min(limit, 20)));
  url.searchParams.set("fields", FIELDS);
  // Exclude adult content
  url.searchParams.set("nsfw", "false");

  const res = await fetch(url.toString(), {
    headers: { "X-MAL-CLIENT-ID": getClientId() },
    next: { revalidate: 300 }, // cache 5 min
  });

  if (!res.ok) {
    throw new Error(`MAL search failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { data: Array<{ node: MALMangaNode }> };
  return data.data.filter((d) => isAllowedMalEntry(d.node)).map((d) => normalizeMalManga(d.node));
}

// null : unknown id. { refused } : exists but may not enter the shared
// catalogue (see malImportRefusal).
export async function getMangaByIdMAL(
  malId: number
): Promise<MangaSearchResult | { refused: ImportRefusal } | null> {
  const url = `${MAL_BASE}/manga/${malId}?fields=${FIELDS}`;

  const res = await fetch(url, {
    headers: { "X-MAL-CLIENT-ID": getClientId() },
    next: { revalidate: 3600 },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`MAL get manga failed: ${res.status}`);

  const node = (await res.json()) as MALMangaNode;
  // Ids come from the client : refuse what search would never have offered.
  const refusal = malImportRefusal(node);
  if (refusal) return { refused: refusal };
  return normalizeMalManga(node);
}

export async function getMangaRankingMAL(
  limit = 100
): Promise<MangaSearchResult[]> {
  const url = new URL(`${MAL_BASE}/manga/ranking`);
  url.searchParams.set("ranking_type", "manga");
  url.searchParams.set("limit", String(Math.min(limit, 500)));
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("nsfw", "false");

  const res = await fetch(url.toString(), {
    headers: { "X-MAL-CLIENT-ID": getClientId() },
    next: { revalidate: 86400 }, // cache 24h — used by cron
  });

  if (!res.ok) throw new Error(`MAL ranking failed: ${res.status}`);

  const data = (await res.json()) as {
    data: Array<{ node: MALMangaNode; ranking: { rank: number } }>;
  };
  return data.data.filter((d) => isAllowedMalEntry(d.node)).map((d) => normalizeMalManga(d.node));
}
