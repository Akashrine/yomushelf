import { contentAllowed, type CatalogueEntry, type ContentContext } from "./suggest";

// "Dans le même genre", under a series : the catalogue series sharing the
// most genres with it (then same readership, then most read), under the
// same content rules as every other proposal.
export function similarSeries(
  target: Pick<CatalogueEntry, "id" | "title" | "genres" | "demographic">,
  catalogue: CatalogueEntry[],
  ctx: ContentContext,
  limit = 12
): CatalogueEntry[] {
  const genres = new Set(target.genres);
  if (genres.size === 0) return [];
  const title = target.title.toLowerCase();
  return catalogue
    .filter((c) => c.id !== target.id && c.title.toLowerCase() !== title && contentAllowed(c, ctx))
    .map((c) => ({ c, shared: c.genres.filter((g) => genres.has(g)).length }))
    .filter((x) => x.shared > 0)
    .sort(
      (a, b) =>
        b.shared - a.shared ||
        Number(b.c.demographic === target.demographic) - Number(a.c.demographic === target.demographic) ||
        (a.c.top_50_rank ?? 999) - (b.c.top_50_rank ?? 999) ||
        a.c.title.localeCompare(b.c.title, "fr")
    )
    .slice(0, limit)
    .map((x) => x.c);
}
