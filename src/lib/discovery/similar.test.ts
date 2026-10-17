import { describe, expect, it } from "vitest";
import { similarSeries } from "./similar";
import type { CatalogueEntry, ContentContext } from "./suggest";

const entry = (id: string, over: Partial<CatalogueEntry> = {}): CatalogueEntry => ({
  id,
  title: id,
  author: null,
  genres: [],
  demographic: null,
  audience_min_age: null,
  total_volumes: 10,
  status: "completed",
  top_50_rank: null,
  cover_url: null,
  ...over,
});

const ctx: ContentContext = { scope: "all", maxAge: null, adultTargetOk: false, declared: { liked: [], avoided: [] } };

describe("similarSeries", () => {
  const target = entry("t", { genres: ["aventure", "action", "comedie"], demographic: "shonen" });

  it("ranks by shared genres, then same readership, then popularity", () => {
    const catalogue = [
      entry("one", { genres: ["aventure"] }),
      entry("three", { genres: ["aventure", "action", "comedie"] }),
      entry("two-shonen", { genres: ["aventure", "action"], demographic: "shonen" }),
      entry("two-ranked", { genres: ["aventure", "action"], top_50_rank: 3 }),
    ];
    expect(similarSeries(target, catalogue, ctx).map((c) => c.id)).toEqual(["three", "two-shonen", "two-ranked", "one"]);
  });

  it("leaves out the series itself, unrelated ones and what may not be proposed", () => {
    const catalogue = [
      target,
      entry("other", { genres: ["romance"] }),
      entry("avoided", { genres: ["aventure", "horreur"] }),
      entry("adult", { genres: ["aventure"], demographic: "seinen" }),
      entry("ok", { genres: ["aventure"] }),
    ];
    const out = similarSeries(target, catalogue, { ...ctx, declared: { liked: [], avoided: ["horreur"] } });
    expect(out.map((c) => c.id)).toEqual(["ok"]);
  });

  it("has nothing to say about a series without genres", () => {
    expect(similarSeries(entry("t"), [entry("a", { genres: ["aventure"] })], ctx)).toEqual([]);
  });
});
