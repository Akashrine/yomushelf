// The rows of Découvrir. Two rules a reader notices at once :
// * nothing they already have, wished or set aside ;
// * each series once on the page. Rows claim series in priority order
//   (personal first), then show in display order. A row left too short
//   is dropped rather than shown half empty.
// Rows by genre family rotate every day, so the page is not the same
// at every visit.

import type { CatalogueEntry } from "./suggest";
import { TERRITORIES, territoriesOf, type TerritoryKey } from "./territories";

export type RowItem = { entry: CatalogueEntry; reason?: string; note?: string | null };

// The page shows no row shorter than this : a shorter row claims nothing.
export const MIN_VISIBLE = 3;

export type RowDraft = {
  key: string;
  title: string;
  subtitle?: string | null;
  items: RowItem[];
  priority: number; // lower claims its series first
  min?: number; // fewer left : the row is dropped and claims nothing (never below MIN_VISIBLE)
  max?: number; // default 15
};

const titleKey = (t: string) => t.trim().toLowerCase();

export function composeRows(drafts: RowDraft[], excluded: Set<string>, excludedTitles: Set<string> = new Set()) {
  const taken = new Set(excluded);
  const takenTitles = new Set([...excludedTitles].map(titleKey));
  const kept = new Map<string, RowItem[]>();
  for (const d of [...drafts].sort((a, b) => a.priority - b.priority)) {
    const items: RowItem[] = [];
    for (const i of d.items) {
      if (items.length >= (d.max ?? 15)) break;
      // The catalogue still holds a few same-title duplicates.
      if (taken.has(i.entry.id) || takenTitles.has(titleKey(i.entry.title))) continue;
      if (items.some((x) => titleKey(x.entry.title) === titleKey(i.entry.title))) continue;
      items.push(i);
    }
    if (items.length < Math.max(MIN_VISIBLE, d.min ?? MIN_VISIBLE)) continue;
    for (const i of items) {
      taken.add(i.entry.id);
      takenTitles.add(titleKey(i.entry.title));
    }
    kept.set(d.key, items);
  }
  return drafts.filter((d) => kept.has(d.key)).map(({ key, title, subtitle }) => ({ key, title, subtitle: subtitle ?? null, items: kept.get(key)! }));
}

// Same order all day for one reader, a different one the next day.
export function dailyOrder<T extends { id: string }>(items: T[], seed: string): T[] {
  const hash = (s: string) => {
    let h = 0x811c9dc5; // FNV-1a
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
    return h >>> 0;
  };
  return items
    .map((item) => ({ item, h: hash(`${seed}:${item.id}`) }))
    .sort((a, b) => a.h - b.h || a.item.id.localeCompare(b.item.id))
    .map((x) => x.item);
}

// One row per genre family (the taste map's territories) rather than per
// genre : "action" and "aventure" mostly hold the same series.
export function territoryRows(
  allowed: CatalogueEntry[],
  seed: string,
  { liked = [], avoided = [] }: { liked?: string[]; avoided?: string[] } = {},
  priority = 50
): RowDraft[] {
  const likedTerritories = new Set(territoriesOf(liked));
  const avoidedTerritories = new Set<TerritoryKey>(
    TERRITORIES.filter((t) => t.genres.every((g) => avoided.includes(g))).map((t) => t.key)
  );
  return TERRITORIES.filter((t) => !avoidedTerritories.has(t.key))
    .map((t) => ({
      territory: t,
      items: dailyOrder(allowed.filter((c) => territoriesOf(c.genres).includes(t.key)), `${seed}:${t.key}`),
    }))
    .sort((a, b) => Number(likedTerritories.has(b.territory.key)) - Number(likedTerritories.has(a.territory.key)) || b.items.length - a.items.length)
    .map(({ territory, items }, i) => ({
      key: `famille-${territory.key}`,
      title: territory.label,
      subtitle: territory.hint,
      items: items.map((entry) => ({ entry })),
      priority: priority + i,
    }));
}

// Drafts travel to the client as ids (the catalogue is already there) :
// the age chips filter them, then the rows are composed again, so a row
// the filter empties frees its series for the next rows.
export type RowDraftRef = Omit<RowDraft, "items"> & { items: { id: string; reason?: string; note?: string | null }[] };

export const toRef = (d: RowDraft): RowDraftRef => ({ ...d, items: d.items.map((i) => ({ id: i.entry.id, reason: i.reason, note: i.note })) });

export function fromRefs(refs: RowDraftRef[], byId: Map<string, CatalogueEntry>, keep: (e: CatalogueEntry) => boolean = () => true): RowDraft[] {
  return refs.map((r) => ({
    ...r,
    items: r.items.flatMap((i) => {
      const entry = byId.get(i.id);
      return entry && keep(entry) ? [{ entry, reason: i.reason, note: i.note }] : [];
    }),
  }));
}
