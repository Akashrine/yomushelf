import { describe, expect, it } from "vitest";
import { buildDeck } from "./deck";
import type { CatalogueEntry, ContentContext } from "./suggest";

const entry = (id: string, over: Partial<CatalogueEntry> = {}): CatalogueEntry => ({
  id,
  title: id,
  author: null,
  genres: ["aventure"],
  demographic: "shonen",
  audience_min_age: null,
  total_volumes: 10,
  status: "completed",
  top_50_rank: null,
  cover_url: null,
  ...over,
});
const ctx: ContentContext = { scope: "all", maxAge: null, adultTargetOk: false, declared: { liked: [], avoided: [] } };

describe("buildDeck", () => {
  it("puts personal suggestions first, then the most read series", () => {
    const catalogue = [entry("b", { top_50_rank: 2 }), entry("a", { top_50_rank: 1 }), entry("c")];
    const deck = buildDeck([{ entry: entry("c"), reason: "Parce que tu as aimé X" }], catalogue, new Set(), ctx);
    expect(deck.map((d) => d.entry.id)).toEqual(["c", "a", "b"]);
    expect(deck[0].reason).toBe("Parce que tu as aimé X");
    expect(deck[1].reason).toBe("Parmi les plus lus en France");
  });

  it("never proposes a series in the library, wished or set aside", () => {
    const deck = buildDeck([{ entry: entry("x"), reason: "r" }], [entry("x"), entry("y")], new Set(["x"]), ctx);
    expect(deck.map((d) => d.entry.id)).toEqual(["y"]);
  });

  it("applies the content rules to the filler", () => {
    const deck = buildDeck(
      [],
      [entry("seinen", { demographic: "seinen" }), entry("avoided", { genres: ["horreur"] }), entry("ok")],
      new Set(),
      { ...ctx, declared: { liked: [], avoided: ["horreur"] } }
    );
    expect(deck.map((d) => d.entry.id)).toEqual(["ok"]);
  });

  it("keeps one card per title and stops at the limit", () => {
    const catalogue = [entry("1", { title: "Naruto" }), entry("2", { title: "naruto" }), entry("3"), entry("4")];
    const deck = buildDeck([], catalogue, new Set(), ctx, 3);
    expect(deck).toHaveLength(3);
    expect(deck.filter((d) => d.entry.title.toLowerCase() === "naruto")).toHaveLength(1);
  });
});
