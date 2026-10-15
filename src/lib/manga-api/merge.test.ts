import { describe, it, expect } from "vitest";
import { mergeSearchResults, type SearchHit } from "./merge";

const hit = (p: Partial<SearchHit> & { title: string }): SearchHit => ({
  source: "db",
  id: null,
  author: null,
  total_volumes: null,
  status: "ongoing",
  cover_url: null,
  genres: [],
  mal_id: null,
  ...p,
});

describe("mergeSearchResults", () => {
  it("keeps a single catalogue hit and adds remote ones after it", () => {
    const out = mergeSearchResults(
      [hit({ title: "Fullmetal Alchemist", id: "fma" })],
      [hit({ source: "mal", title: "Fullmetal Alchemist Gaiden", mal_id: 99 })],
      10
    );
    expect(out.map((h) => h.title)).toEqual(["Fullmetal Alchemist", "Fullmetal Alchemist Gaiden"]);
  });

  it("drops a remote hit already in the catalogue, by id or by title", () => {
    const out = mergeSearchResults(
      [hit({ title: "Spy × Family", id: "sxf", mal_id: 119161 }), hit({ title: "Fullmetal Alchemist", id: "fma" })],
      [
        hit({ source: "mal", title: "SPY×FAMILY", mal_id: 119161 }),
        hit({ source: "mal", title: "Fullmetal Alchemist", mal_id: 25 }),
        hit({ source: "mal", title: "Fullmetal Alchemist", mal_id: 26 }),
      ],
      10
    );
    expect(out.map((h) => h.source)).toEqual(["db", "db"]);
  });

  it("never drops catalogue hits to honour the limit", () => {
    const local = Array.from({ length: 4 }, (_, i) => hit({ title: `S${i}`, id: `s${i}` }));
    expect(mergeSearchResults(local, [hit({ source: "mal", title: "Other", mal_id: 1 })], 2)).toHaveLength(4);
  });
  it("drops a remote hit known locally under an alias", () => {
    const local = [hit({ source: "db", id: "1", title: "L'Attaque des Titans", alt_titles: ["shingeki no kyojin", "attack on titan"] })];
    const remote = [
      hit({ source: "mal", title: "Shingeki no Kyojin", mal_id: 23390, alt_titles: ["Attack on Titan"] }),
      hit({ source: "mal", title: "Shingeki no Kyojin: Before the Fall", mal_id: 2 }),
    ];
    expect(mergeSearchResults(local, remote, 10).map((h) => h.title)).toEqual([
      "L'Attaque des Titans",
      "Shingeki no Kyojin: Before the Fall",
    ]);
  });
});
