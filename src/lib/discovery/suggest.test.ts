import { describe, it, expect } from "vitest";
import { ageLabel, matchesFilters, otherUniverses, suggest, tasteProfile, territoryTastes, type CatalogueEntry } from "./suggest";

function entry(partial: Partial<CatalogueEntry> & { id: string; title: string }): CatalogueEntry {
  return {
    author: null,
    genres: [],
    demographic: null,
    audience_min_age: null,
    total_volumes: null,
    status: "ongoing",
    top_50_rank: null,
    cover_url: null,
    ...partial,
  };
}

const cnlj = { audience_age_source: "cnlj" as const, audience_age_scope: "series" as const };
const onePiece = entry({ id: "op", title: "One Piece", genres: ["aventure", "action", "comedie"], demographic: "shonen", author: "Eiichiro Oda", audience_min_age: 9, ...cnlj });
const drStone = entry({ id: "ds", title: "Dr. Stone", genres: ["aventure", "science-fiction"], demographic: "shonen", audience_min_age: 10, status: "completed", total_volumes: 27, ...cnlj });
const haikyu = entry({ id: "hk", title: "Haikyu!!", genres: ["sport", "comedie"], demographic: "shonen", audience_min_age: 8, status: "completed", total_volumes: 45 });
const monster = entry({ id: "mo", title: "Monster", genres: ["mystere", "psychologique", "drame"], demographic: "seinen", audience_min_age: 16 });
const daï = entry({ id: "dai", title: "Dragon Quest - Daï", genres: ["aventure", "fantasy", "action"], demographic: "shonen", audience_min_age: 9 });
const wanted = entry({ id: "ws", title: "Wanted (Oda)", genres: ["action"], demographic: "shonen", author: "Eiichiro Oda", audience_min_age: 9 });
const chi = entry({ id: "chi", title: "Chi", genres: ["tranche-de-vie", "comedie"], demographic: "kodomo", audience_min_age: 6, audience_age_source: "cnlj", audience_age_scope: "series", total_volumes: 12, status: "completed" });
const catalogue = [onePiece, drStone, haikyu, monster, daï, wanted, chi];

describe("suggest", () => {
  const library = [
    { manga_id: "op", read: 12, owned: 14 },
    { manga_id: "ds", read: 5, owned: 8 },
  ];

  it("never suggests what the reader already has or wishes", () => {
    const out = suggest(library, catalogue, new Set(["op", "ds", "dai"]));
    expect(out.map((s) => s.entry.id)).not.toContain("op");
    expect(out.map((s) => s.entry.id)).not.toContain("ds");
    expect(out.map((s) => s.entry.id)).not.toContain("dai");
  });

  it("ranks by shared taste and explains why", () => {
    const out = suggest(library, catalogue, new Set(["op", "ds"]));
    expect(out[0].entry.id).toBe("dai");
    expect(out[0].reason).toMatch(/^Parce que tu lis (One Piece|Dr\. Stone)/);
    expect(out[0].reason).toContain("aventure");
  });

  it("highlights the same author", () => {
    const out = suggest(library, catalogue, new Set(["op", "ds"]));
    const w = out.find((s) => s.entry.id === "ws");
    expect(w?.reason).toBe("Du même auteur que One Piece");
  });

  it("drops series above the chosen age", () => {
    const out = suggest(library, catalogue, new Set(["op", "ds"]), { maxAge: 10 });
    expect(out.map((s) => s.entry.id)).not.toContain("mo");
  });

  it("stays close to the ages the reader already reads", () => {
    // One Piece (9) and Dr. Stone (10) read : nothing above 12 is suggested
    const out = suggest(library, [...catalogue, entry({ id: "old", title: "Pour ados", genres: ["aventure", "action"], demographic: "shonen", audience_min_age: 16, ...cnlj })], new Set(["op", "ds"]));
    expect(out.map((s) => s.entry.id)).not.toContain("old");
  });

  it("returns nothing without any reading or volume (cold start is handled by selections)", () => {
    expect(suggest([], catalogue, new Set())).toEqual([]);
  });

  it("weighs readings above unread volumes", () => {
    const profile = tasteProfile(
      [
        { manga_id: "hk", read: 10, owned: 10 },
        { manga_id: "mo", read: 0, owned: 18 },
      ],
      new Map(catalogue.map((c) => [c.id, c]))
    );
    expect(profile.genres.get("sport")!).toBeGreaterThan(profile.genres.get("mystere")!);
  });
});

describe("matchesFilters", () => {
  it("filters by genre, age, status and length", () => {
    expect(matchesFilters(chi, { genre: "comedie" })).toBe(true);
    expect(matchesFilters(chi, { genre: "sport" })).toBe(false);
    expect(matchesFilters(monster, { maxAge: 12 })).toBe(false);
    // a recommendation on one volume is not one for the series
    expect(matchesFilters(entry({ id: "v", title: "v", audience_min_age: 9, audience_age_source: "cnlj", audience_age_scope: "volume", audience_age_volumes: [1] }), { maxAge: 12 })).toBe(false);
    expect(matchesFilters(chi, { maxAge: 8 })).toBe(true); // CNLJ indication
    expect(matchesFilters(entry({ id: "e", title: "e", audience_min_age: 6, audience_age_source: "estimate" }), { maxAge: 12 })).toBe(false); // an estimate is not an indication
    expect(matchesFilters(entry({ id: "x", title: "x" }), { maxAge: 12 })).toBe(false); // unknown age is not assumed safe
    expect(matchesFilters(drStone, { status: "completed" })).toBe(true);
    expect(matchesFilters(onePiece, { status: "completed" })).toBe(false);
    expect(matchesFilters(chi, { length: "court" })).toBe(true);
    expect(matchesFilters(haikyu, { length: "long" })).toBe(true);
    expect(matchesFilters(onePiece, { length: "long" })).toBe(false); // unknown length
  });
});

describe("preferences", () => {
  const byId = new Map(catalogue.map((c) => [c.id, c]));

  it("a 100-volume series weighs the same as a 3-volume one", () => {
    const t = territoryTastes([{ manga_id: "hk", read: 45, owned: 45 }, { manga_id: "mo", read: 3, owned: 3 }], byId);
    const sport = t.find((x) => x.key === "sport")!.share;
    const frissons = t.find((x) => x.key === "frissons")!.share;
    // Haikyu touches 2 territories, Monster 2 : each gives half its weight to each
    expect(sport).toBeCloseTo(frissons, 5);
  });

  it("a liked series counts double ; Pas pour moi counts nothing", () => {
    const liked = tasteProfile([{ manga_id: "hk", read: 1, owned: 1, liked: true }, { manga_id: "mo", read: 1, owned: 1 }], byId);
    expect(liked.genres.get("sport")!).toBeGreaterThan(liked.genres.get("mystere")!);
    const disliked = tasteProfile([{ manga_id: "mo", read: 5, owned: 5, liked: false }], byId);
    expect(disliked.total).toBe(0);
  });

  it("starts from declared tastes without any history", () => {
    const out = suggest([], catalogue, new Set(), { declared: { liked: ["sport"], avoided: [] } });
    expect(out[0].entry.id).toBe("hk");
    expect(out[0].reason).toBe("Parce que tu aimes sport");
  });

  it("explains with what the reader said they liked", () => {
    const out = suggest([{ manga_id: "op", read: 1, owned: 1, liked: true }], catalogue, new Set(["op"]));
    expect(out.find((s) => s.entry.id === "dai")?.reason).toMatch(/^Parce que tu as aimé One Piece/);
  });

  it("an owned-only series is named as owned, not as read", () => {
    const out = suggest([{ manga_id: "op", read: 0, owned: 3 }], catalogue, new Set(["op"]));
    expect(out.find((s) => s.entry.id === "dai")?.reason).toMatch(/^Parce que tu as One Piece chez toi/);
  });

  it("leaves out avoided genres ; unknown age is allowed but young-adult magazines only for their readers", () => {
    const unknownShonen = entry({ id: "us", title: "Shōnen sans âge", genres: ["aventure", "action"], demographic: "shonen" });
    const unknownSeinen = entry({ id: "use", title: "Seinen sans âge", genres: ["aventure", "action"], demographic: "seinen" });
    const out = suggest([{ manga_id: "op", read: 3, owned: 3 }], [...catalogue, unknownShonen, unknownSeinen], new Set(["op"]), {
      declared: { liked: [], avoided: ["fantasy"] },
    });
    const ids = out.map((s) => s.entry.id);
    expect(ids).not.toContain("dai"); // fantasy avoided
    expect(ids).toContain("us"); // unknown age, shōnen : proposed (labelled "âge non vérifié")
    expect(ids).not.toContain("use"); // unknown age, seinen, reader reads no seinen
    const seinenReader = suggest([{ manga_id: "op", read: 3, owned: 3 }, { manga_id: "mo", read: 2, owned: 2 }], [...catalogue, unknownSeinen], new Set(["op", "mo"]));
    expect(seinenReader.map((s) => s.entry.id)).toContain("use");
  });

  it("youth mode proposes only series the CNLJ recommends as a whole", () => {
    const unknownShonen = entry({ id: "us", title: "Shōnen sans âge", genres: ["aventure", "action"], demographic: "shonen" });
    const out = suggest([{ manga_id: "op", read: 3, owned: 3 }], [...catalogue, unknownShonen], new Set(["op"]), { scope: "youth_verified" });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((s) => s.entry.audience_age_source === "cnlj" && s.entry.audience_age_scope === "series")).toBe(true);
  });

  it("states ages from verified information only", () => {
    expect(ageLabel(chi)).toBe("dès 6 ans (sélection CNLJ)");
    expect(ageLabel({ ...chi, audience_age_year: 2024 })).toBe("dès 6 ans (sélection CNLJ 2024)");
    expect(ageLabel(entry({ id: "v", title: "v", audience_min_age: 9, audience_age_source: "cnlj", audience_age_scope: "volume", audience_age_volumes: [1] }))).toBe("avis CNLJ sur le tome 1 (dès 9 ans)");
    expect(ageLabel(entry({ id: "e", title: "e", audience_min_age: 12, audience_age_source: "estimate" }))).toBe("âge non vérifié");
  });

  it("proposes another universe the reader has not explored", () => {
    const out = otherUniverses([{ manga_id: "op", read: 3, owned: 3 }], catalogue, new Set(["op"]));
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].reason).toMatch(/^Pour changer/);
    expect(out.map((o) => o.entry.id)).not.toContain("op");
  });
});

describe("suggest with series neighbours", () => {
  // A cosy series sharing no genre with One Piece, but close by what it tells.
  const yotsuba = entry({ id: "yo", title: "Yotsuba&!", genres: ["tranche-de-vie"], demographic: "seinen", audience_min_age: 9, ...cnlj });
  const books = [...catalogue, yotsuba];
  const liked = [{ manga_id: "op", read: 12, owned: 14, liked: true }];

  it("proposes a close series without a shared genre, and says why", () => {
    const neighbours = new Map([["op", [{ id: "yo", rank: 1 }]]]);
    const out = suggest(liked, books, new Set(["op"]), { neighbours });
    const yo = out.find((s) => s.entry.id === "yo");
    expect(yo?.reason).toBe("Proche de One Piece, que tu as aimé");
    expect(yo?.because).toEqual(["One Piece"]);
  });

  it("without neighbours, the same series is not proposed", () => {
    expect(suggest(liked, books, new Set(["op"])).some((s) => s.entry.id === "yo")).toBe(false);
  });

  it("a far neighbour alone is not enough", () => {
    const neighbours = new Map([["op", [{ id: "yo", rank: 12 }]]]);
    expect(suggest(liked, books, new Set(["op"]), { neighbours }).some((s) => s.entry.id === "yo")).toBe(false);
  });

  it("content rules still win over closeness", () => {
    const neighbours = new Map([["op", [{ id: "mo", rank: 1 }]]]);
    const out = suggest(liked, books, new Set(["op"]), { neighbours, scope: "youth_verified" });
    expect(out.some((s) => s.entry.id === "mo")).toBe(false);
  });

  it("closeness lifts a series sharing genres above the others", () => {
    const reading = [{ manga_id: "op", read: 12, owned: 14 }];
    const without = suggest(reading, books, new Set(["op"])).map((s) => s.entry.id);
    const withNear = suggest(reading, books, new Set(["op"]), { neighbours: new Map([["op", [{ id: "hk", rank: 1 }]]]) }).map((s) => s.entry.id);
    expect(withNear.indexOf("hk")).toBeLessThan(without.indexOf("hk"));
  });
});
