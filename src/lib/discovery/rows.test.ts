import { describe, expect, it } from "vitest";
import { composeRows, dailyOrder, fromRefs, territoryRows, toRef, type RowDraft } from "./rows";
import type { CatalogueEntry } from "./suggest";

const entry = (id: string, genres: string[] = ["action"], title = `Série ${id}`): CatalogueEntry => ({
  id,
  title,
  author: null,
  genres,
  demographic: null,
  audience_min_age: null,
  audience_age_source: null,
  total_volumes: 10,
  status: "completed",
  top_50_rank: null,
  cover_url: null,
});
const draft = (key: string, ids: string[], priority: number, extra: Partial<RowDraft> = {}): RowDraft => ({
  key,
  title: key,
  items: ids.map((id) => ({ entry: entry(id) })),
  priority,
  ...extra,
});

describe("composeRows", () => {
  it("never shows a series the reader has, wished or set aside", () => {
    const rows = composeRows([draft("a", ["1", "2", "3", "4", "5"], 0)], new Set(["2"]));
    expect(rows[0].items.map((i) => i.entry.id)).toEqual(["1", "3", "4", "5"]);
  });

  it("shows each series once, rows with a lower priority claim first, display order kept", () => {
    const rows = composeRows(
      [draft("shown-first", ["1", "2", "3", "4", "5", "6"], 10), draft("claims-first", ["5", "6", "7", "8"], 0)],
      new Set()
    );
    expect(rows.map((r) => r.key)).toEqual(["shown-first", "claims-first"]);
    expect(rows[0].items.map((i) => i.entry.id)).toEqual(["1", "2", "3", "4"]);
    expect(rows[1].items.map((i) => i.entry.id)).toEqual(["5", "6", "7", "8"]);
  });

  it("drops a row left too short, and its series stay free for the next rows", () => {
    const rows = composeRows([draft("short", ["1", "2"], 0), draft("next", ["1", "2", "3", "4"], 1)], new Set());
    expect(rows.map((r) => r.key)).toEqual(["next"]);
  });

  it("never keeps a row the page would hide : its series go to the next rows", () => {
    const rows = composeRows([draft("pour-toi", ["1", "2"], 0, { min: 1 }), draft("next", ["1", "2", "3", "4"], 1)], new Set());
    expect(rows.map((r) => r.key)).toEqual(["next"]);
    expect(rows[0].items.map((i) => i.entry.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("an age filter that empties a row frees its series for the next rows", () => {
    const byId = new Map(["1", "2", "3", "4", "5", "6"].map((id) => [id, entry(id)]));
    const refs = [draft("first", ["1", "2", "3"], 0, { min: 3 }), draft("second", ["1", "4", "5", "6"], 1)].map(toRef);
    const rows = composeRows(fromRefs(refs, byId, (e) => e.id !== "2"), new Set());
    expect(rows.map((r) => r.key)).toEqual(["second"]);
    expect(rows[0].items.map((i) => i.entry.id)).toEqual(["1", "4", "5", "6"]);
  });

  it("skips a same-title duplicate of a series already on the shelf or on the page", () => {
    const rows = composeRows(
      [{ key: "a", title: "a", priority: 0, min: 1, items: [{ entry: entry("x", ["action"], "One Piece") }, { entry: entry("y", ["action"], "Naruto") }, { entry: entry("z", ["action"], "naruto ") }, { entry: entry("k", ["action"], "Kingdom") }, { entry: entry("b", ["action"], "Bleach") }] }],
      new Set(),
      new Set(["ONE PIECE"])
    );
    expect(rows[0].items.map((i) => i.entry.id)).toEqual(["y", "k", "b"]);
  });

  it("caps a row", () => {
    const ids = Array.from({ length: 30 }, (_, i) => String(i));
    expect(composeRows([draft("a", ids, 0)], new Set())[0].items).toHaveLength(15);
  });
});

describe("dailyOrder", () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ id: `id-${i}` }));
  it("is stable for one seed and keeps every item", () => {
    expect(dailyOrder(items, "2026-10-24:u")).toEqual(dailyOrder(items, "2026-10-24:u"));
    expect(dailyOrder(items, "2026-10-24:u")).toHaveLength(20);
  });
  it("changes from one day to the next", () => {
    expect(dailyOrder(items, "2026-10-25:u").map((i) => i.id)).not.toEqual(dailyOrder(items, "2026-10-24:u").map((i) => i.id));
  });
});

describe("territoryRows", () => {
  const catalogue = [entry("a", ["action"]), entry("b", ["aventure"]), entry("c", ["sport"]), entry("d", ["comedie", "sport"])];
  it("groups genres by family, liked families first", () => {
    const rows = territoryRows(catalogue, "s", { liked: ["sport"] });
    expect(rows[0].key).toBe("famille-sport");
    expect(rows.find((r) => r.key === "famille-aventure")?.items.map((i) => i.entry.id).sort()).toEqual(["a", "b"]);
  });
  it("leaves out a family whose genres are all avoided", () => {
    const rows = territoryRows(catalogue, "s", { avoided: ["sport"] });
    expect(rows.some((r) => r.key === "famille-sport")).toBe(false);
  });
});
