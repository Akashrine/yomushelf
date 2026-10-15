import { describe, it, expect } from "vitest";
import { lastKnownPrice, nextVolumeToBuy, type OwnedVolume } from "./value";

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
