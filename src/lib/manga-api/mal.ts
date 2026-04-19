import type { MALMangaNode, MangaSearchResult } from "./types";

const MAL_BASE = "https://api.myanimelist.net/v2";
const FIELDS =
  "id,title,main_picture,alternative_titles,status,num_volumes,genres,authors{first_name,last_name},serialization{name}";

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
  return data.data.map((d) => normalizeMalManga(d.node));
}

export async function getMangaByIdMAL(
  malId: number
): Promise<MangaSearchResult | null> {
  const url = `${MAL_BASE}/manga/${malId}?fields=${FIELDS}`;

  const res = await fetch(url, {
    headers: { "X-MAL-CLIENT-ID": getClientId() },
    next: { revalidate: 3600 },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`MAL get manga failed: ${res.status}`);

  const node = (await res.json()) as MALMangaNode;
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
  return data.data.map((d) => normalizeMalManga(d.node));
}
