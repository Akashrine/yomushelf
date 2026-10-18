import { describe, expect, it } from "vitest";
import { gateStep, maskEmail } from "./gate";

const base = { age_band: null, heard_from: null, parent_consent_at: null } as const;

describe("gateStep", () => {
  it("asks the age first, then the source", () => {
    expect(gateStep(null, false)).toBe("age");
    expect(gateStep(base, false)).toBe("age");
    expect(gateStep({ ...base, age_band: "15_plus" }, false)).toBe("source");
  });

  it("lets 15 and over in once the source is known", () => {
    expect(gateStep({ ...base, age_band: "15_plus", heard_from: "ami" }, false)).toBe("ready");
  });

  it("holds under 15 until a parent consents", () => {
    const kid = { ...base, age_band: "under_15", heard_from: "librairie" } as const;
    expect(gateStep(kid, false)).toBe("parent");
    expect(gateStep(kid, true)).toBe("pending");
    expect(gateStep({ ...kid, parent_consent_at: "2026-10-18T10:00:00Z" }, true)).toBe("ready");
  });
});

describe("maskEmail", () => {
  it("keeps the first letter and the domain", () => {
    expect(maskEmail("julie.martin@gmail.com")).toBe("j***@gmail.com");
    expect(maskEmail("nope")).toBe("***");
  });
});
