import { describe, expect, it } from "vitest";
import { z } from "zod";
import { MAX_VOLUME, volumeCeiling, volumeNumberField } from "./schema";

describe("volume number bound", () => {
  it("accepts 1 to MAX_VOLUME", () => {
    expect(volumeNumberField.parse(1)).toBe(1);
    expect(volumeNumberField.parse(MAX_VOLUME)).toBe(MAX_VOLUME);
  });

  it("refuses a typo that would draw millions of tiles", () => {
    expect(volumeNumberField.safeParse(2_000_000_000).success).toBe(false);
    expect(volumeNumberField.safeParse(MAX_VOLUME + 1).success).toBe(false);
    expect(volumeNumberField.safeParse(0).success).toBe(false);
    expect(volumeNumberField.safeParse(1.5).success).toBe(false);
  });

  it("applies to form values once coerced", () => {
    const formField = z.coerce.number().pipe(volumeNumberField);
    expect(formField.parse("12")).toBe(12);
    expect(formField.safeParse("2000000000").success).toBe(false);
  });
});

describe("volumeCeiling", () => {
  it("caps a finished series at its total", () => expect(volumeCeiling(7, "completed")).toBe(7));
  it("lets an ongoing or paused series run past a total that may be late", () => {
    expect(volumeCeiling(7, "ongoing")).toBe(MAX_VOLUME);
    expect(volumeCeiling(7, "paused")).toBe(MAX_VOLUME);
  });
  it("does not cap without a known total", () => {
    expect(volumeCeiling(null, "completed")).toBe(MAX_VOLUME);
    expect(volumeCeiling(0, "completed")).toBe(MAX_VOLUME);
  });
});
