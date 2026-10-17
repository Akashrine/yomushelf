import { describe, expect, it } from "vitest";
import { gapBelow, rangeLabel } from "./fill";

describe("gapBelow", () => {
  it("proposes every earlier volume on an empty shelf", () => {
    expect(gapBelow([], 29)).toEqual({ from: 1, to: 28 });
  });

  it("stops at the nearest volume already marked", () => {
    expect(gapBelow([1, 2, 3, 10], 15)).toEqual({ from: 11, to: 14 });
  });

  it("has nothing to propose when the previous volume is marked", () => {
    expect(gapBelow([1, 2, 3], 4)).toBeNull();
  });

  it("has nothing to propose for the first volume", () => {
    expect(gapBelow([], 1)).toBeNull();
  });

  it("proposes a single volume", () => {
    expect(gapBelow([1], 3)).toEqual({ from: 2, to: 2 });
  });
});

describe("rangeLabel", () => {
  it("names one volume or a range", () => {
    expect(rangeLabel({ from: 2, to: 2 })).toBe("le tome 2");
    expect(rangeLabel({ from: 1, to: 28 })).toBe("les tomes 1 à 28");
  });
});
