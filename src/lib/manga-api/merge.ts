// Merges catalogue search results with an external source, without
// duplicates. Catalogue hits always come first and are never dropped.

export type SearchHit = {
  source: "db" | "private" | "mal";
  id: string | null; // catalogue id (db / private)
  title: string;
  author: string | null;
  total_volumes: number | null;
  status: "ongoing" | "completed" | "paused";
  cover_url: string | null;
  genres: string[];
  mal_id: number | null;
};

export function titleKey(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/×/g, "x")
    .replace(/[^a-z0-9]+/g, "");
}

export function mergeSearchResults(local: SearchHit[], remote: SearchHit[], limit: number): SearchHit[] {
  const malIds = new Set(local.map((h) => h.mal_id).filter((v): v is number => v != null));
  const titles = new Set(local.map((h) => titleKey(h.title)));
  const extra: SearchHit[] = [];
  for (const r of remote) {
    if (r.mal_id != null && malIds.has(r.mal_id)) continue;
    const key = titleKey(r.title);
    if (titles.has(key)) continue;
    titles.add(key);
    if (r.mal_id != null) malIds.add(r.mal_id);
    extra.push(r);
  }
  return [...local, ...extra].slice(0, Math.max(limit, local.length));
}
