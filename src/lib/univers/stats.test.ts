import { describe, it, expect } from "vitest";
import { lastMonths, readingsOverview, spendingOverview, tasteMap, wishlistEstimate } from "./stats";
import type { OwnedVolume } from "@/lib/collection/value";
import type { Reading } from "@/lib/collection/reading";
import type { CatalogueEntry } from "@/lib/discovery/suggest";

const vol = (p: Partial<OwnedVolume>): OwnedVolume => ({
  manga_id: "a",
  volume_number: 1,
  price_eur: 7,
  acquisition_type: "bought",
  acquired_at: "2026-10-02",
  ...p,
});
const read = (p: Partial<Reading>): Reading => ({ manga_id: "a", volume_number: 1, status: "read", finished_on: null, ...p });

describe("lastMonths", () => {
  it("returns the 12 months ending with the current one", () => {
    const m = lastMonths("2026-10-15");
    expect(m).toHaveLength(12);
    expect(m[0]).toBe("2025-11");
    expect(m[11]).toBe("2026-10");
  });
});

describe("spendingOverview", () => {
  it("counts only what was bought with a typed price as spent", () => {
    const s = spendingOverview(
      [
        vol({ volume_number: 1, price_eur: 7.2 }),
        vol({ volume_number: 2, price_eur: 6.9, acquired_at: "2026-09-10" }),
        vol({ volume_number: 3, price_eur: 7.2, acquisition_type: "gift" }),
        vol({ volume_number: 4, price_eur: null }),
        vol({ volume_number: 5, price_eur: 7.2, acquisition_type: null }),
        vol({ volume_number: 6, price_eur: null, acquisition_type: "borrowed" }),
        vol({ volume_number: 7, price_eur: 4, acquired_at: null }),
      ],
      "2026-10-15"
    );
    expect(s.paid).toBe(18.1);
    expect(s.paidCount).toBe(3);
    expect(s.undatedPaid).toBe(4);
    expect(s.months.at(-1)).toEqual({ key: "2026-10", amount: 7.2 });
    expect(s.months.at(-2)).toEqual({ key: "2026-09", amount: 6.9 });
    expect(s.gifts).toBe(7.2);
    expect(s.unpricedBought).toBe(1);
    expect(s.unknownOrigin).toBe(1);
    expect(s.borrowed).toBe(1);
  });
});

describe("readingsOverview", () => {
  it("does not count volumes past the total toward a finished series", () => {
    const o = readingsOverview(
      [read({ volume_number: 1 }), read({ volume_number: 2 }), read({ volume_number: 4 })],
      new Map([["a", 3]]),
      "2026-10-15"
    );
    expect(o.seriesFinished).toBe(0);
  });

  it("charts dated readings only and counts finished series", () => {
    const o = readingsOverview(
      [
        read({ volume_number: 1, finished_on: "2026-10-01" }),
        read({ volume_number: 2, finished_on: "2026-01-05" }),
        read({ volume_number: 3 }),
        read({ manga_id: "b", volume_number: 1, status: "reading" }),
      ],
      new Map([["a", 3], ["b", 10]]),
      "2026-10-15"
    );
    expect(o.total).toBe(3);
    expect(o.undated).toBe(1);
    expect(o.thisYear).toBe(2);
    expect(o.months.at(-1)?.count).toBe(1);
    expect(o.seriesFinished).toBe(1);
    expect(o.inProgress).toBe(1);
  });
});

describe("wishlistEstimate", () => {
  it("separates typed prices from estimates", () => {
    const w = wishlistEstimate([
      { target_price: 7.2, fallback_price: 7.5 },
      { target_price: null, fallback_price: 7.5 },
      { target_price: null, fallback_price: null },
    ]);
    expect(w).toMatchObject({ count: 3, known: 7.2, estimated: 7.5, total: 14.7, unknownCount: 1 });
  });
});

describe("tasteMap", () => {
  it("turns readings into genre shares", () => {
    const cat: CatalogueEntry[] = [
      { id: "a", title: "A", author: "X", genres: ["sport"], demographic: "shonen", audience_min_age: null, total_volumes: null, status: "ongoing", top_50_rank: null, cover_url: null },
      { id: "b", title: "B", author: "Y", genres: ["romance"], demographic: "shojo", audience_min_age: null, total_volumes: null, status: "ongoing", top_50_rank: null, cover_url: null },
    ];
    const t = tasteMap([{ manga_id: "a", read: 10, owned: 10 }, { manga_id: "b", read: 1, owned: 1 }], cat);
    expect(t.genres[0].key).toBe("sport");
    expect(t.genres.reduce((s, g) => s + g.share, 0)).toBeCloseTo(1);
    expect(t.demographics[0].label).toBe("shōnen");
  });
});
