import { describe, it, expect } from "vitest";
import { lastMonths, readingsOverview, spendingOverview, waitingAtHome, wishPrice, wishlistEstimate } from "./stats";
import type { OwnedVolume } from "@/lib/collection/value";
import type { Reading } from "@/lib/collection/reading";

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
  it("separates indicative prices, estimates with their basis, and unknown prices", () => {
    expect(wishPrice(7.2, 6.9, 7)).toEqual({ kind: "indicative", amount: 7.2 });
    expect(wishPrice(null, 6.9, 7)).toEqual({ kind: "series", amount: 6.9 });
    expect(wishPrice(null, null, 7)).toEqual({ kind: "average", amount: 7 });
    expect(wishPrice(null, null, null)).toEqual({ kind: "unknown" });
    const w = wishlistEstimate([wishPrice(7.2, null, null), wishPrice(null, 7.5, null), wishPrice(null, null, null)]);
    expect(w).toMatchObject({ count: 3, known: 7.2, estimated: 7.5, total: 14.7, unknownCount: 1 });
  });

  it("an unknown price never becomes zero in the total : it is counted apart", () => {
    const w = wishlistEstimate([wishPrice(null, null, null), wishPrice(null, null, null)]);
    expect(w).toMatchObject({ total: 0, unknownCount: 2, estimatedCount: 0, knownCount: 0 });
  });
});

describe("spending coverage", () => {
  it("counts priced bought volumes out of all bought ones ; gifts and borrowed apart", () => {
    const s = spendingOverview(
      [vol({ price_eur: 7 }), vol({ volume_number: 2, price_eur: null }), vol({ volume_number: 3, acquisition_type: "gift", price_eur: 7 }), vol({ volume_number: 4, acquisition_type: "borrowed", price_eur: null })],
      "2026-10-15"
    );
    expect(s).toMatchObject({ paid: 7, paidCount: 1, boughtCount: 2, giftsCount: 1, borrowed: 1 });
  });
});

describe("gifts and whole-series wishes", () => {
  it("never shows a partial gift value as the whole, nor unknown as zero", () => {
    const s = spendingOverview(
      [vol({ acquisition_type: "gift", price_eur: 7 }), vol({ volume_number: 2, acquisition_type: "gift", price_eur: null })],
      "2026-10-15"
    );
    expect(s).toMatchObject({ gifts: 7, giftsCount: 2, giftsPricedCount: 1, paid: 0 });
  });
  it("counts a whole-series wish apart, never priced as one volume", () => {
    const w = wishlistEstimate([{ kind: "whole_series" }, wishPrice(null, 7, null)]);
    expect(w).toMatchObject({ count: 2, total: 7, wholeSeriesCount: 1, estimatedCount: 1 });
  });
});

describe("waitingAtHome", () => {
  it("lists series with unread volumes at home, borrowed included", () => {
    const shelf = (manga_id: string, owned: number[], read: number[]) => ({
      manga_id, title: manga_id, slug: manga_id, cover_url: null, owned, borrowed: [], read, reading: [], lastFinished: null,
    });
    const w = waitingAtHome([shelf("a", [1, 2, 3], [1]), shelf("b", [1], [1]), shelf("c", [], [1, 2])]);
    expect(w.total).toBe(2);
    expect(w.series.map((s) => s.manga_id)).toEqual(["a"]);
  });
});
