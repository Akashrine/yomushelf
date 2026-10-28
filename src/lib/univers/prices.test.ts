import { describe, expect, it } from "vitest";
import { priceIndex } from "./prices";

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

describe("publisher names", () => {
  it("does not mix two publishers starting with « Le »", () => {
    const price = priceIndex([
      { id: "a", publisher_fr: "Le Lézard Noir", list_price_eur: 19 },
      { id: "b", publisher_fr: "Le Lézard noir", list_price_eur: 19 },
      { id: "c", publisher_fr: "Le Lézard Noir", list_price_eur: 19 },
    ]);
    expect(price("x", "Le Lombard")).toBeNull();
    expect(price("x", "le lezard noir")).toEqual({ amount: 19, basis: "publisher" });
  });
  it("reads « Crunchyroll (ex-Kazé) » as Crunchyroll", () => {
    const price = priceIndex([1, 2, 3].map((i) => ({ id: `k${i}`, publisher_fr: "Crunchyroll (ex-Kazé)", list_price_eur: 7.05 })));
    expect(price("x", "Crunchyroll")).toEqual({ amount: 7.05, basis: "publisher" });
  });
});
