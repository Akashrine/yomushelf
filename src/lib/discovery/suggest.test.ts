import { describe, it, expect } from "vitest";
import { matchesFilters, suggest, tasteProfile, type CatalogueEntry } from "./suggest";

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

const onePiece = entry({ id: "op", title: "One Piece", genres: ["aventure", "action", "comedie"], demographic: "shonen", author: "Eiichiro Oda", audience_min_age: 9 });
const drStone = entry({ id: "ds", title: "Dr. Stone", genres: ["aventure", "science-fiction"], demographic: "shonen", audience_min_age: 10, status: "completed", total_volumes: 27 });
const haikyu = entry({ id: "hk", title: "Haikyu!!", genres: ["sport", "comedie"], demographic: "shonen", audience_min_age: 8, status: "completed", total_volumes: 45 });
const monster = entry({ id: "mo", title: "Monster", genres: ["mystere", "psychologique", "drame"], demographic: "seinen", audience_min_age: 16 });
const daï = entry({ id: "dai", title: "Dragon Quest - Daï", genres: ["aventure", "fantasy", "action"], demographic: "shonen", audience_min_age: 9 });
const wanted = entry({ id: "ws", title: "Wanted (Oda)", genres: ["action"], demographic: "shonen", author: "Eiichiro Oda" });
const chi = entry({ id: "chi", title: "Chi", genres: ["tranche-de-vie", "comedie"], demographic: "kodomo", audience_min_age: 6, total_volumes: 12, status: "completed" });
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
    const out = suggest(library, [...catalogue, entry({ id: "old", title: "Pour ados", genres: ["aventure", "action"], demographic: "shonen", audience_min_age: 16 })], new Set(["op", "ds"]));
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
    expect(matchesFilters(entry({ id: "x", title: "x" }), { maxAge: 12 })).toBe(false); // unknown age is not assumed safe
    expect(matchesFilters(drStone, { status: "completed" })).toBe(true);
    expect(matchesFilters(onePiece, { status: "completed" })).toBe(false);
    expect(matchesFilters(chi, { length: "court" })).toBe(true);
    expect(matchesFilters(haikyu, { length: "long" })).toBe(true);
    expect(matchesFilters(onePiece, { length: "long" })).toBe(false); // unknown length
  });
});
