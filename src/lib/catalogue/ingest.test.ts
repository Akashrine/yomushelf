import { describe, it, expect, vi } from "vitest";
import { ingestMode, runIngest, type ExistingRow, type IngestRepo } from "./ingest";
import type { MangaSearchResult } from "@/lib/manga-api/types";

const item = (mal_id: number, title: string, extra: Partial<MangaSearchResult> = {}): MangaSearchResult => ({
  source: "mal",
  external_id: String(mal_id),
  title,
  author: "A",
  publisher_fr: null,
  total_volumes: 10,
  status: "ongoing",
  avg_price_eur: 7.5,
  genre_primary: null,
  cover_url: `https://cdn.myanimelist.net/${mal_id}.jpg`,
  external_ids: { mal_id },
  ...extra,
});

function setup(existing: Record<number, ExistingRow> = {}, names: { title: string; aliases: string[] }[] = []) {
  const repo: IngestRepo & { inserts: unknown[]; updates: unknown[] } = {
    inserts: [],
    updates: [],
    findByMalId: async (id) => existing[id] ?? null,
    namesLike: async () => names,
    insert: async (row) => void repo.inserts.push(row),
    update: async (id, row) => void repo.updates.push({ id, row }),
  };
  const cacheCover = vi.fn(async () => "https://storage.test/c.jpg");
  return { repo, cacheCover };
}

const limits = { maxWrites: 20, maxCovers: 20, deadlineMs: 60_000 };
const deps = (repo: IngestRepo, cacheCover: (u: string, i: string) => Promise<string | null>, ranking: MangaSearchResult[]) => ({
  ranking: async () => ranking,
  repo,
  cacheCover,
  newId: () => "new-id",
  now: () => Date.parse("2026-10-16T03:00:00Z"),
});

describe("ingestMode", () => {
  it("is off unless explicitly enabled ; a call may only ask for a dry run", () => {
    expect(ingestMode(undefined, null)).toBe("off");
    expect(ingestMode("yes", null)).toBe("off");
    expect(ingestMode("dry_run", null)).toBe("dry_run");
    expect(ingestMode("on", null)).toBe("on");
    expect(ingestMode(undefined, "dry_run")).toBe("dry_run");
    expect(ingestMode("on", "dry_run")).toBe("dry_run");
    expect(ingestMode(undefined, "on")).toBe("off");
  });
});

describe("runIngest", () => {
  it("off : reads and writes nothing", async () => {
    const { repo, cacheCover } = setup();
    const ranking = vi.fn(async () => [item(1, "New")]);
    const r = await runIngest("off", { ...deps(repo, cacheCover, []), ranking }, limits);
    expect(ranking).not.toHaveBeenCalled();
    expect(r.written).toBe(0);
  });

  it("dry run : plans an insert, writes nothing, downloads nothing", async () => {
    const { repo, cacheCover } = setup();
    const r = await runIngest("dry_run", deps(repo, cacheCover, [item(1, "New series")]), limits);
    expect(r.planned).toEqual([{ action: "insert", title: "New series", mal_id: 1 }]);
    expect(repo.inserts).toHaveLength(0);
    expect(cacheCover).not.toHaveBeenCalled();
  });

  it("on : never touches an editorial row except a missing cover", async () => {
    const { repo, cacheCover } = setup({
      13: { id: "op", updated_at: "2020-01-01", cover_url: null, curated: true, external_ids: { mal_id: 13 } },
      11: { id: "na", updated_at: "2020-01-01", cover_url: "x", curated: true, external_ids: { mal_id: 11 } },
    });
    const r = await runIngest("on", deps(repo, cacheCover, [item(13, "One Piece (romaji)"), item(11, "Naruto")]), limits);
    expect(repo.updates).toEqual([{ id: "op", row: { cover_url: "https://storage.test/c.jpg" } }]);
    expect(r.skipped.editorial).toBe(1);
  });

  it("on : skips a series known under the same title or alias", async () => {
    const { repo, cacheCover } = setup({}, [{ title: "L'Attaque des Titans", aliases: ["shingeki no kyojin"] }]);
    const r = await runIngest("on", deps(repo, cacheCover, [item(23390, "Shingeki no Kyojin")]), limits);
    expect(repo.inserts).toHaveLength(0);
    expect(r.skipped.duplicate).toBe(1);
  });

  it("on : keeps known ids when updating, and respects the write limit", async () => {
    const { repo, cacheCover } = setup({
      5: { id: "five", updated_at: "2020-01-01", cover_url: "c", curated: false, external_ids: { mal_id: 5, isbn_13: "978" } },
    });
    const ranking = [item(5, "Five"), item(6, "Six"), item(7, "Seven")];
    const r = await runIngest("on", deps(repo, cacheCover, ranking), { ...limits, maxWrites: 2 });
    expect(repo.updates[0]).toMatchObject({ id: "five", row: { external_ids: { mal_id: 5, isbn_13: "978" } } });
    expect(r.written).toBe(2);
    expect(r.skipped.over_limit).toBe(1);
  });
});
