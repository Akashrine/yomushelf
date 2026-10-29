import { describe, expect, it } from "vitest";
import { dedupeBySlug, slugify, seriesDescription, type PublicSeries } from "./public-series";

const series = (over: Partial<PublicSeries>): PublicSeries => ({
  id: "1", title: "Naruto", slug: "naruto", author: "Masashi Kishimoto", genres: ["action"], demographic: "shonen",
  audience_min_age: null, total_volumes: 72, status: "completed", top_50_rank: null, cover_url: null,
  publisher_fr: "Kana", list_price_eur: 6.99, synopsis: null, ...over,
});

describe("slugify", () => {
  it("drops accents, symbols and edges", () => {
    expect(slugify("Yotsuba&!")).toBe("yotsuba-et");
    expect(slugify("L'Attaque des Titans")).toBe("l-attaque-des-titans");
    expect(slugify("Chi - Une vie de chat")).toBe("chi-une-vie-de-chat");
    expect(slugify("Été")).toBe("ete");
  });
});

describe("dedupeBySlug", () => {
  it("keeps the verified-age row among duplicates and sorts by slug", () => {
    const rows = [series({ id: "a", slug: "one" }), series({ id: "b", slug: "one", audience_age_source: "cnlj" }), series({ id: "c", slug: "abc" })];
    expect(dedupeBySlug(rows).map((r) => r.id)).toEqual(["c", "b"]);
  });
});

describe("seriesDescription", () => {
  it("states only what is known", () => {
    expect(seriesDescription(series({ audience_min_age: 9 }))).not.toContain("Âge conseillé");
    expect(seriesDescription(series({ audience_min_age: 9, audience_age_source: "cnlj", audience_age_scope: "series" }))).toContain("dès 9 ans");
  });
});

import { ageFromSlug, agePageOf, seriesForAge } from "./public-series";

describe("age pages", () => {
  const verified = (age: number, over: Partial<PublicSeries> = {}) =>
    series({ audience_age_source: "cnlj", audience_age_scope: "series", audience_min_age: age, ...over });

  it("parses only the listed ages", () => {
    expect(ageFromSlug("des-10-ans")).toBe(10);
    expect(ageFromSlug("des-9-ans")).toBeNull();
    expect(ageFromSlug("des-10")).toBeNull();
  });

  it("lists series at or under the age, verified for the whole series only", () => {
    const rows = [
      verified(9, { id: "a", title: "A" }),
      verified(13, { id: "b", title: "B" }),
      series({ id: "c", title: "C", audience_age_source: "estimate", audience_min_age: 6 }),
      verified(6, { id: "d", title: "D", audience_age_scope: "volume" }),
    ];
    expect(seriesForAge(rows, 10).map((s) => s.id)).toEqual(["a"]);
  });

  it("puts a series on the first age page that fits", () => {
    expect(agePageOf(verified(9))).toBe(10);
    expect(agePageOf(verified(15))).toBeNull();
    expect(agePageOf(series({}))).toBeNull();
  });
});
