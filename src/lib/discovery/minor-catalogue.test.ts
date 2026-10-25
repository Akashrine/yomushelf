import { describe, expect, it } from "vitest";
import { minorMayAdd } from "./minor-catalogue";

const row = (age: number | null, source: "cnlj" | "estimate" | null, scope: "series" | "volume" | null) => ({
  audience_min_age: age,
  audience_age_source: source,
  audience_age_scope: scope,
});

describe("minorMayAdd", () => {
  it("accepts a verified age for the whole series, up to 14", () => {
    expect(minorMayAdd(row(6, "cnlj", "series"))).toBe(true);
    expect(minorMayAdd(row(14, "cnlj", "series"))).toBe(true);
  });
  it("refuses 15 and over", () => {
    expect(minorMayAdd(row(15, "cnlj", "series"))).toBe(false);
  });
  it("refuses an unknown age, an estimate, and an age that covers only some volumes", () => {
    expect(minorMayAdd(row(null, null, null))).toBe(false);
    expect(minorMayAdd(row(9, "estimate", "series"))).toBe(false);
    expect(minorMayAdd(row(9, "cnlj", "volume"))).toBe(false);
  });
});
