import { describe, expect, it } from "vitest";
import { composeRows, dailyOrder, territoryRows, type RowDraft } from "./rows";
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
    const rows = composeRows([draft("short", ["1", "2", "3"], 0), draft("next", ["1", "2", "3", "4"], 1)], new Set());
    expect(rows.map((r) => r.key)).toEqual(["next"]);
  });

  it("keeps a personal row of one when its minimum allows it", () => {
    expect(composeRows([draft("pour-toi", ["1"], 0, { min: 1 })], new Set())).toHaveLength(1);
  });

  it("skips a same-title duplicate of a series already on the shelf or on the page", () => {
    const rows = composeRows(
      [{ key: "a", title: "a", priority: 0, min: 1, items: [{ entry: entry("x", ["action"], "One Piece") }, { entry: entry("y", ["action"], "Naruto") }, { entry: entry("z", ["action"], "naruto ") }] }],
      new Set(),
      new Set(["ONE PIECE"])
    );
    expect(rows[0].items.map((i) => i.entry.id)).toEqual(["y"]);
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
