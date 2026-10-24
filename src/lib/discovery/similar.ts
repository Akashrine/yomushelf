import { closeness, contentAllowed, type CatalogueEntry, type ContentContext } from "./suggest";

// "Dans le même genre", under a series : the catalogue series closest to
// it, by shared genres and by what they tell (series_neighbours, when
// computed), then same readership, then most read ; under the same
// content rules as every other proposal.
export function similarSeries(
  target: Pick<CatalogueEntry, "id" | "title" | "genres" | "demographic">,
  catalogue: CatalogueEntry[],
  ctx: ContentContext,
  limit = 12,
  neighbours: { id: string; rank: number }[] = []
): CatalogueEntry[] {
  const genres = new Set(target.genres);
  const near = new Map(neighbours.map((n) => [n.id, closeness(n.rank)]));
  if (genres.size === 0 && near.size === 0) return [];
  const title = target.title.toLowerCase();
  return catalogue
    .filter((c) => c.id !== target.id && c.title.toLowerCase() !== title && contentAllowed(c, ctx))
    .map((c) => {
      const shared = c.genres.filter((g) => genres.has(g)).length;
      const close = near.get(c.id) ?? 0;
      return { c, shared, close, score: (genres.size ? shared / genres.size : 0) + 0.8 * close };
    })
    .filter((x) => x.shared > 0 || x.close > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.c.demographic === target.demographic) - Number(a.c.demographic === target.demographic) ||
        (a.c.top_50_rank ?? 999) - (b.c.top_50_rank ?? 999) ||
        a.c.title.localeCompare(b.c.title, "fr")
    )
    .slice(0, limit)
    .map((x) => x.c);
}
