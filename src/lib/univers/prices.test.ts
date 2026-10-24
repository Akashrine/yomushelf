import { describe, expect, it } from "vitest";
import { priceIndex } from "./prices";
import { collectionValue, wishPrice } from "./stats";

const rows = [
  { id: "op", publisher_fr: "Glénat", list_price_eur: "7.20" },
  { id: "db", publisher_fr: "Glénat", list_price_eur: 7.2 },
  { id: "bl", publisher_fr: "Glénat Manga", list_price_eur: 6.99 },
  { id: "new", publisher_fr: "Éditions Glénat", list_price_eur: null },
  { id: "rare", publisher_fr: "Petit éditeur", list_price_eur: null },
  { id: "kana1", publisher_fr: "Kana", list_price_eur: 7.45 },
];

describe("priceIndex", () => {
  const price = priceIndex(rows);
  it("uses the series' own publisher price first", () => {
    expect(price("op")).toEqual({ amount: 7.2, basis: "series" });
  });
  it("falls back to the publisher's usual price (median), whatever its spelling", () => {
    expect(price("new")).toEqual({ amount: 7.2, basis: "publisher" });
  });
  it("says nothing for a publisher seen too rarely, or unknown", () => {
    expect(price("rare")).toBeNull();
    expect(price("unknown-id", "Kana")).toBeNull(); // one Kana series only
    expect(price("unknown-id", null)).toBeNull();
  });
  it("can price a series outside the list from its publisher name", () => {
    expect(price("imported", "glenat")).toEqual({ amount: 7.2, basis: "publisher" });
  });
});

describe("collectionValue", () => {
  const price = priceIndex(rows);
  const v = (manga_id: string, price_eur: number | null, acquisition_type: "bought" | "gift" | "borrowed" | null = null) => ({ manga_id, volume_number: 1, price_eur, acquisition_type, acquired_at: null });
  it("values each volume at the typed price, else the publisher price, and tells them apart", () => {
    const r = collectionValue([v("op", null), v("op", null), v("db", 5, "bought"), v("rare", null), v("op", null, "borrowed")], price);
    expect(r).toEqual({ total: 19.4, typed: 5, typedCount: 1, listed: 14.4, listedCount: 2, unknownCount: 1 });
  });
  it("counts gifts too : it is what the collection is worth, not what was spent", () => {
    expect(collectionValue([v("op", null, "gift")], price).total).toBe(7.2);
  });
});

describe("wishPrice", () => {
  it("prefers what the reader typed, then paid for the series, then the publisher price, then their average", () => {
    expect(wishPrice(8, 7, 6, 7.2)).toEqual({ kind: "indicative", amount: 8 });
    expect(wishPrice(null, 7, 6, 7.2)).toEqual({ kind: "series", amount: 7 });
    expect(wishPrice(null, null, 6, 7.2)).toEqual({ kind: "publisher", amount: 7.2 });
    expect(wishPrice(null, null, 6)).toEqual({ kind: "average", amount: 6 });
    expect(wishPrice(null, null, null)).toEqual({ kind: "unknown" });
  });
});
