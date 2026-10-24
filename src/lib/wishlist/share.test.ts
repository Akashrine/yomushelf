import { describe, expect, it } from "vitest";
import { DisplayNameSchema, defaultShareExpiry, isActiveShare } from "./share";

describe("defaultShareExpiry", () => {
  it("ends on the next 31 January, end of day in Paris", () => {
    expect(defaultShareExpiry(new Date("2026-11-15T10:00:00Z")).toISOString()).toBe("2027-01-31T22:59:59.000Z");
  });
  it("still this winter's 31 January in early January", () => {
    expect(defaultShareExpiry(new Date("2027-01-05T10:00:00Z")).toISOString()).toBe("2027-01-31T22:59:59.000Z");
  });
  it("next year's after 31 January", () => {
    expect(defaultShareExpiry(new Date("2027-02-01T10:00:00Z")).toISOString()).toBe("2028-01-31T22:59:59.000Z");
  });
  it("New Year's Eve night in Paris counts as the new year", () => {
    expect(defaultShareExpiry(new Date("2026-12-31T23:30:00Z")).toISOString()).toBe("2027-01-31T22:59:59.000Z");
  });
  it("30 days when 31 January is under a week away", () => {
    const now = new Date("2027-01-28T10:00:00Z");
    expect(defaultShareExpiry(now).getTime() - now.getTime()).toBe(30 * 86_400_000);
  });
  it("always within the database's one-year cap", () => {
    for (let d = 0; d < 400; d += 3) {
      const now = new Date(Date.UTC(2026, 0, 1) + d * 86_400_000);
      const span = defaultShareExpiry(now).getTime() - now.getTime();
      expect(span).toBeGreaterThan(6 * 86_400_000);
      expect(span).toBeLessThanOrEqual(365 * 86_400_000);
    }
  });
});

describe("DisplayNameSchema", () => {
  it("trims and accepts a first name", () => {
    expect(DisplayNameSchema.parse("  Léo ")).toBe("Léo");
  });
  it("refuses empty or too long", () => {
    expect(DisplayNameSchema.safeParse("   ").success).toBe(false);
    expect(DisplayNameSchema.safeParse("x".repeat(31)).success).toBe(false);
  });
});

describe("isActiveShare", () => {
  const now = Date.parse("2026-12-01T00:00:00Z");
  it("active until expiry, unless revoked", () => {
    expect(isActiveShare({ expires_at: "2027-01-31T22:59:59Z", revoked_at: null }, now)).toBe(true);
    expect(isActiveShare({ expires_at: "2027-01-31T22:59:59Z", revoked_at: "2026-11-30T00:00:00Z" }, now)).toBe(false);
    expect(isActiveShare({ expires_at: "2026-11-30T00:00:00Z", revoked_at: null }, now)).toBe(false);
    expect(isActiveShare(null, now)).toBe(false);
  });
});
