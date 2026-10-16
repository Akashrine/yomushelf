// The swipe deck of Découvrir : one series at a time, right = wish,
// left = "Pas pour moi". Personal suggestions first, then other universes,
// then the most read series the reader may be proposed (same content rules
// as suggestions), so a reader without history still has cards.

import { contentAllowed, type CatalogueEntry, type ContentContext } from "./suggest";

export type DeckCard = { entry: CatalogueEntry; reason: string };

export function buildDeck(
  personal: { entry: CatalogueEntry; reason: string }[],
  catalogue: CatalogueEntry[],
  excluded: Set<string>, // in the library, wished, or set aside
  ctx: ContentContext,
  limit = 40
): DeckCard[] {
  const deck: DeckCard[] = [];
  const seen = new Set<string>();
  const titles = new Set<string>(); // the catalogue still holds a few duplicates
  const push = (entry: CatalogueEntry, reason: string) => {
    const title = entry.title.toLowerCase();
    if (deck.length >= limit || excluded.has(entry.id) || seen.has(entry.id) || titles.has(title)) return;
    seen.add(entry.id);
    titles.add(title);
    deck.push({ entry, reason });
  };
  for (const p of personal) push(p.entry, p.reason);
  const popular = [...catalogue]
    .filter((c) => contentAllowed(c, ctx))
    .sort((a, b) => (a.top_50_rank ?? 999) - (b.top_50_rank ?? 999) || a.title.localeCompare(b.title, "fr"));
  for (const c of popular) push(c, c.top_50_rank ? "Parmi les plus lus en France" : "Dans notre sélection");
  return deck;
}
