// Publisher prices (mangas.list_price_eur, migration 20261025000100). In
// France a book's price is set by its publisher : a regular volume costs
// the same everywhere, and almost always the same across a series.
// For a series without a researched price, the usual price of its
// publisher (median of its researched series) ; otherwise unknown. Never a
// made-up default.

export type PriceRow = { id: string; publisher_fr: string | null; list_price_eur: number | string | null };
export type ListPrice = { amount: number; basis: "series" | "publisher" };

const publisherKey = (p: string | null) =>
  (p ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !["editions", "edition", "manga", "les", "le", "la"].includes(w))
    .join(" ");

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 100) / 100;
};

export function priceIndex(rows: PriceRow[], minPerPublisher = 3): (mangaId: string, publisher?: string | null) => ListPrice | null {
  const byId = new Map<string, number>();
  const byPublisher = new Map<string, number[]>();
  const publisherOf = new Map<string, string>();
  for (const r of rows) {
    const key = publisherKey(r.publisher_fr);
    if (key) publisherOf.set(r.id, key);
    if (r.list_price_eur == null) continue;
    const price = Number(r.list_price_eur);
    if (!(price > 0)) continue;
    byId.set(r.id, price);
    if (key) byPublisher.set(key, [...(byPublisher.get(key) ?? []), price]);
  }
  // Only a publisher seen often enough says something about its usual price.
  const usual = new Map([...byPublisher].filter(([, xs]) => xs.length >= minPerPublisher).map(([k, xs]) => [k, median(xs)]));
  return (mangaId, publisher) => {
    const own = byId.get(mangaId);
    if (own != null) return { amount: own, basis: "series" };
    const key = publisherOf.get(mangaId) ?? publisherKey(publisher ?? null);
    const usualPrice = key ? usual.get(key) : undefined;
    return usualPrice != null ? { amount: usualPrice, basis: "publisher" } : null;
  };
}
