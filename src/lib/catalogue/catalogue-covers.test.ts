import { describe, expect, it } from "vitest";
import { runCatalogueCovers, type CatalogueCoversDeps, type CoverTarget } from "./catalogue-covers";

function deps(targets: CoverTarget[], over: Partial<CatalogueCoversDeps> = {}) {
  const saved: [string, string][] = [];
  const calls: string[] = [];
  let clock = 0;
  const d: CatalogueCoversDeps = {
    targets: async () => targets,
    malCover: async (id) => (calls.push(`mal:${id}`), `https://cdn.myanimelist.net/${id}.jpg`),
    bookCover: async (title) => (calls.push(`book:${title}`), `https://books.google.com/${title}.jpg`),
    cache: async (url, id) => `https://storage/covers/${id}?from=${url}`,
    save: async (id, url) => void saved.push([id, url]),
    now: () => clock,
    pause: async () => void (clock += 1),
    ...over,
  };
  return { d, saved, calls };
}

const t = (id: string, malId: number | null = null): CoverTarget => ({ id, title: `Série ${id}`, total: 10, malId });

describe("runCatalogueCovers", () => {
  it("takes the MyAnimeList cover by exact id, and never asks Google Books then", async () => {
    const { d, saved, calls } = deps([t("a", 42)]);
    const r = await runCatalogueCovers(d, { maxSeries: 10, deadlineMs: 1000 });
    expect(r.written).toBe(1);
    expect(calls).toEqual(["mal:42"]);
    expect(saved[0][1]).toContain("myanimelist");
  });

  it("falls back to the French volume 1 without an id, or when MyAnimeList has no picture", async () => {
    const { d, calls } = deps([t("a"), t("b", 7)], { malCover: async () => null });
    const r = await runCatalogueCovers(d, { maxSeries: 10, deadlineMs: 1000 });
    expect(r.written).toBe(2);
    expect(calls).toEqual(["book:Série a", "book:Série b"]);
  });

  it("gives no cover to an entry MyAnimeList refuses, and reports it", async () => {
    const { d, saved, calls } = deps([t("a", 9)], { malCover: async () => "refused" });
    const r = await runCatalogueCovers(d, { maxSeries: 10, deadlineMs: 1000 });
    expect(r).toMatchObject({ written: 0, refused: ["Série a"] });
    expect(saved).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("reports a series with no cover anywhere, and survives a provider error", async () => {
    const { d } = deps([t("a", 1)], { malCover: async () => Promise.reject(new Error("503")), bookCover: async () => null });
    const r = await runCatalogueCovers(d, { maxSeries: 10, deadlineMs: 1000 });
    expect(r).toMatchObject({ written: 0, missing: ["Série a"] });
  });

  it("stops at the series budget and at the deadline", async () => {
    const many = Array.from({ length: 5 }, (_, i) => t(String(i), i + 1));
    expect((await runCatalogueCovers(deps(many).d, { maxSeries: 2, deadlineMs: 1000 })).stoppedBy).toBe("series_budget");
    expect((await runCatalogueCovers(deps(many).d, { maxSeries: 10, deadlineMs: 1 })).stoppedBy).toBe("deadline");
  });
});
