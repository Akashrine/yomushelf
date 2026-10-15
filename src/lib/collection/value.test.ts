import { describe, it, expect } from "vitest";
import {
  buildMonthlyTimeline,
  lastKnownPrice,
  nextVolumeToBuy,
  summarizeCollection,
  summarizeWishlist,
  type OwnedVolume,
} from "./value";
import { readIndex, type Reading } from "./reading";

function vol(partial: Partial<OwnedVolume>): OwnedVolume {
  return {
    manga_id: "m1",
    volume_number: 1,
    price_eur: 7,
    acquisition_type: "bought",
    acquired_at: "2026-01-10",
    ...partial,
  };
}

function read(volume_number: number, finished_on: string | null = null, manga_id = "m1"): Reading {
  return { manga_id, volume_number, status: "read", finished_on };
}

const none = readIndex([]);

describe("summarizeCollection", () => {
  it("separates value from what was paid : gifts have value but cost nothing", () => {
    const s = summarizeCollection(
      [vol({ volume_number: 1, price_eur: 7 }), vol({ volume_number: 2, price_eur: 8, acquisition_type: "gift" })],
      none,
      0
    );
    expect(s.valueEur).toBe(15);
    expect(s.paidEur).toBe(7);
    expect(s.giftEur).toBe(8);
  });

  it("computes cost per volume read over every reading, owned or not", () => {
    const vols = [
      vol({ volume_number: 1, price_eur: 6 }),
      vol({ volume_number: 2, price_eur: 6 }),
      vol({ volume_number: 3, price_eur: 6 }),
    ];
    const s = summarizeCollection(vols, readIndex([read(1), read(2)]), 3);
    expect(s.paidEur).toBe(18);
    expect(s.costPerReadEur).toBe(6);
  });

  it("has no cost per read when nothing is read yet", () => {
    expect(summarizeCollection([vol({})], none, 0).costPerReadEur).toBeNull();
  });

  it("counts sleeping money only for bought, unread, priced volumes", () => {
    const s = summarizeCollection(
      [
        vol({ volume_number: 1, price_eur: 7 }),
        vol({ volume_number: 2, price_eur: 7 }),
        vol({ volume_number: 3, price_eur: 7 }),
        vol({ volume_number: 4, price_eur: 9, acquisition_type: "gift" }),
        vol({ volume_number: 5, price_eur: null }),
      ],
      readIndex([read(3)]),
      1
    );
    expect(s.sleepingEur).toBe(14);
    expect(s.sleepingCount).toBe(3); // the unpriced one still sleeps
  });

  it("counts missing prices in volumes but not in amounts", () => {
    const s = summarizeCollection([vol({ volume_number: 1, price_eur: null }), vol({ volume_number: 2 })], none, 0);
    expect(s.volumesTotal).toBe(2);
    expect(s.valueEur).toBe(7);
    expect(s.missingPriceCount).toBe(1);
  });

  it("keeps borrowed volumes out of value and missing prices", () => {
    const s = summarizeCollection(
      [vol({ volume_number: 1, price_eur: null, acquisition_type: "borrowed" }), vol({ volume_number: 2 })],
      none,
      0
    );
    expect(s.valueEur).toBe(7);
    expect(s.missingPriceCount).toBe(0);
    expect(s.borrowedCount).toBe(1);
  });

  it("counts a volume of unknown origin in value, never in what was paid", () => {
    const s = summarizeCollection([vol({ acquisition_type: null, price_eur: 7.2 })], none, 0);
    expect(s.valueEur).toBe(7.2);
    expect(s.paidEur).toBe(0);
    expect(s.sleepingCount).toBe(0);
  });

  it("avoids floating point drift", () => {
    const s = summarizeCollection(
      [vol({ volume_number: 1, price_eur: 6.95 }), vol({ volume_number: 2, price_eur: 7.29 }), vol({ volume_number: 3, price_eur: 7.2 })],
      none,
      0
    );
    expect(s.valueEur).toBe(21.44);
  });
});

describe("buildMonthlyTimeline", () => {
  it("accumulates value month by month and splits read / unread", () => {
    const { months } = buildMonthlyTimeline(
      [vol({ volume_number: 1, acquired_at: "2026-01-05" }), vol({ volume_number: 2, acquired_at: "2026-02-05" })],
      readIndex([read(1, "2026-02-20")]),
      "2026-02-28"
    );
    expect(months.map((m) => m.key)).toEqual(["2026-01", "2026-02"]);
    expect(months[0]).toMatchObject({ readEur: 0, unreadEur: 7, addedCount: 1 });
    expect(months[1]).toMatchObject({ readEur: 7, unreadEur: 7, totalEur: 14, addedCount: 1 });
  });

  it("treats a reading without date as read since the volume arrived", () => {
    const { months } = buildMonthlyTimeline(
      [vol({ acquired_at: "2026-01-05" })],
      readIndex([read(1, null)]),
      "2026-02-28"
    );
    expect(months[0].readEur).toBe(7);
  });

  it("leaves volumes with an unknown acquisition date out of the chart", () => {
    const t = buildMonthlyTimeline(
      [vol({ volume_number: 1, acquired_at: null }), vol({ volume_number: 2, acquired_at: "2026-02-01" })],
      none,
      "2026-02-28"
    );
    expect(t.undatedCount).toBe(1);
    expect(t.months.at(-1)?.totalEur).toBe(7);
  });

  it("caps the window to the last N months", () => {
    const { months } = buildMonthlyTimeline([vol({ acquired_at: "2024-01-05" })], none, "2026-02-28", 12);
    expect(months).toHaveLength(12);
    expect(months[0].key).toBe("2025-03");
    expect(months[0].totalEur).toBe(7);
  });

  it("is empty without any priced volume", () => {
    expect(buildMonthlyTimeline([vol({ price_eur: null })], none, "2026-02-28").months).toEqual([]);
  });
});

describe("series helpers", () => {
  it("finds the next volume to buy and the last typed price", () => {
    const vols = [
      vol({ volume_number: 1, price_eur: 6.9, acquired_at: "2026-01-01" }),
      vol({ volume_number: 2, price_eur: 7.2, acquired_at: "2026-03-01" }),
      vol({ volume_number: 3, price_eur: null, acquired_at: "2026-04-01" }),
    ];
    expect(nextVolumeToBuy(vols)).toBe(4);
    expect(lastKnownPrice(vols)).toBe(7.2);
  });

  it("has no default price for an empty series", () => {
    expect(nextVolumeToBuy([])).toBe(1);
    expect(lastKnownPrice([])).toBeNull();
  });
});

describe("summarizeWishlist", () => {
  it("sums known target prices and flags missing ones", () => {
    expect(summarizeWishlist([{ target_price: 7.2 }, { target_price: null }, { target_price: 7.29 }])).toEqual({
      totalEur: 14.49,
      missingPriceCount: 1,
      count: 3,
    });
  });
});
