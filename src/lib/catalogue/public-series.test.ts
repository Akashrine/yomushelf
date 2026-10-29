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
