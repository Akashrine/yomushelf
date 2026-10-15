import { describe, it, expect } from "vitest";
import {
  buildMonthlyTimeline,
  lastKnownPrice,
  summarizeCollection,
  summarizeSeries,
  summarizeWishlist,
  type OwnedVolume,
} from "./value";

function vol(partial: Partial<OwnedVolume>): OwnedVolume {
  return {
    manga_id: "m1",
    volume_number: 1,
    price_eur: 7,
    acquisition_type: "bought",
    acquired_at: "2026-01-10",
    read_status: "unread",
    read_at: null,
    ...partial,
  };
}

describe("summarizeCollection", () => {
  it("separates value from what was paid : gifts have value but cost nothing", () => {
    const s = summarizeCollection([
      vol({ volume_number: 1, price_eur: 7 }),
      vol({ volume_number: 2, price_eur: 8, acquisition_type: "gift" }),
    ]);
    expect(s.valueEur).toBe(15);
    expect(s.paidEur).toBe(7);
    expect(s.giftEur).toBe(8);
  });

  it("computes cost per volume read over all volumes read", () => {
    const s = summarizeCollection([
      vol({ volume_number: 1, price_eur: 6, read_status: "read" }),
      vol({ volume_number: 2, price_eur: 6, read_status: "read" }),
      vol({ volume_number: 3, price_eur: 6 }),
      vol({ volume_number: 4, price_eur: null, acquisition_type: "borrowed", read_status: "read" }),
    ]);
    expect(s.paidEur).toBe(18);
    expect(s.volumesRead).toBe(3);
    expect(s.costPerReadEur).toBe(6);
  });

  it("has no cost per read when nothing is read yet", () => {
    expect(summarizeCollection([vol({})]).costPerReadEur).toBeNull();
  });

  it("counts sleeping money only for bought, unread, priced volumes", () => {
    const s = summarizeCollection([
      vol({ volume_number: 1, price_eur: 7 }),
      vol({ volume_number: 2, price_eur: 7, read_status: "reading" }),
      vol({ volume_number: 3, price_eur: 7, read_status: "read" }),
      vol({ volume_number: 4, price_eur: 9, acquisition_type: "gift" }),
      vol({ volume_number: 5, price_eur: null }),
    ]);
    expect(s.sleepingEur).toBe(14);
    expect(s.sleepingCount).toBe(3); // the unpriced one still sleeps
  });

  it("counts missing prices in volumes but not in amounts", () => {
    const s = summarizeCollection([
      vol({ volume_number: 1, price_eur: null }),
      vol({ volume_number: 2, price_eur: 7.2 }),
    ]);
    expect(s.volumesTotal).toBe(2);
    expect(s.missingPriceCount).toBe(1);
    expect(s.valueEur).toBe(7.2);
  });

  it("keeps borrowed volumes out of value and missing prices", () => {
    const s = summarizeCollection([
      vol({ acquisition_type: "borrowed", price_eur: null, read_status: "read" }),
    ]);
    expect(s.valueEur).toBe(0);
    expect(s.missingPriceCount).toBe(0);
    expect(s.borrowedCount).toBe(1);
    expect(s.volumesRead).toBe(1);
  });

  it("avoids floating point drift", () => {
    const s = summarizeCollection(
      Array.from({ length: 3 }, (_, i) => vol({ volume_number: i + 1, price_eur: 0.1 }))
    );
    expect(s.valueEur).toBe(0.3);
  });
});

describe("buildMonthlyTimeline", () => {
  it("accumulates value month by month and splits read / unread", () => {
    const months = buildMonthlyTimeline(
      [
        vol({ volume_number: 1, acquired_at: "2026-01-05", price_eur: 7, read_status: "read", read_at: "2026-02-01" }),
        vol({ volume_number: 2, acquired_at: "2026-02-05", price_eur: 8 }),
      ],
      "2026-03-15"
    );
    expect(months.map((m) => m.key)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(months[0]).toMatchObject({ readEur: 0, unreadEur: 7, addedCount: 1 });
    expect(months[1]).toMatchObject({ readEur: 7, unreadEur: 8, totalEur: 15, addedEur: 8 });
    expect(months[2]).toMatchObject({ totalEur: 15, addedCount: 0 });
    expect(months[1].spines.map((s) => s.read)).toEqual([true, false]);
  });

  it("treats a read volume without read date as read since acquisition", () => {
    const [m] = buildMonthlyTimeline(
      [vol({ acquired_at: "2026-03-01", read_status: "read" })],
      "2026-03-20"
    );
    expect(m.readEur).toBe(7);
  });

  it("caps the window to the last N months", () => {
    const months = buildMonthlyTimeline(
      [vol({ acquired_at: "2024-06-01" })],
      "2026-10-15",
      12
    );
    expect(months).toHaveLength(12);
    expect(months[0].key).toBe("2025-11");
    expect(months[0].totalEur).toBe(7);
  });

  it("is empty without any priced volume", () => {
    expect(buildMonthlyTimeline([vol({ price_eur: null })], "2026-10-15")).toEqual([]);
  });
});

describe("series helpers", () => {
  it("finds the next volume and the last typed price", () => {
    const s = summarizeSeries([
      vol({ volume_number: 1, price_eur: 6.9, acquired_at: "2026-01-01" }),
      vol({ volume_number: 3, price_eur: 7.2, acquired_at: "2026-04-01" }),
      vol({ volume_number: 2, price_eur: null, acquired_at: "2026-05-01" }),
    ]);
    expect(s.nextVolumeNumber).toBe(4);
    expect(s.lastPriceEur).toBe(7.2);
  });

  it("has no default price for an empty series", () => {
    expect(lastKnownPrice([])).toBeNull();
    expect(summarizeSeries([]).nextVolumeNumber).toBe(1);
  });
});

describe("summarizeWishlist", () => {
  it("sums known target prices and flags missing ones", () => {
    expect(
      summarizeWishlist([{ target_price: 7.2 }, { target_price: null }, { target_price: 6.9 }])
    ).toEqual({ totalEur: 14.1, missingPriceCount: 1, count: 3 });
  });
});
