import { describe, expect, it } from "vitest";
import type { GoogleBooksItem } from "@/lib/manga-api/google-books";
import { parseVolumeTitle, pickVolumes, runVolumeCovers, volumeCoversMode, type VolumeCoversDeps } from "./volume-covers";

const item = (title: string, extra: Partial<GoogleBooksItem> = {}): GoogleBooksItem => ({
  title,
  language: "fr",
  isbn13: `978${Math.floor(Math.random() * 1e10)}`,
  thumbnail: "https://books.google.com/x",
  ...extra,
});

describe("parseVolumeTitle", () => {
  it.each([
    ["Sakamoto Days - Tome 02", 2],
    ["Blue Lock T15", 15],
    ["Blue Lock Tome 30", 30],
    ["Kaiju n°8 - Tome 4", 4],
    ["Naruto 7", 7],
  ])("reads %s as volume %i", (title, volume) => {
    const series = title.startsWith("Kaiju") ? "Kaiju n°8" : title.split(/ [-T0-9]/)[0];
    expect(parseVolumeTitle(title, series)?.volume).toBe(volume);
  });

  it("flags the Édition originale", () => {
    expect(parseVolumeTitle("Gunnm - Édition originale - Tome 03", "Gunnm")).toEqual({ volume: 3, original: true });
  });

  it.each([
    ["Gunnm Last Order (sens français) - Tome 01", "Gunnm"],
    ["Blue Lock - Episode Nagi T08", "Blue Lock"],
    ["Blue Lock Tome 1 . Edition collector", "Blue Lock"],
    ["One Piece Party - Tome 1", "One Piece"],
    ["Dragon Ball Super - Tome 3", "Dragon Ball"],
    ["Naruto", "Naruto"],
  ])("ignores %s", (title, series) => {
    expect(parseVolumeTitle(title, series)).toBeNull();
  });
});

describe("pickVolumes", () => {
  it("keeps French items with ISBN and cover, within the series length", () => {
    const picked = pickVolumes(
      [
        item("Gunnm - Tome 1"),
        item("Gunnm - Tome 2", { language: "en" }),
        item("Gunnm - Tome 3", { isbn13: null }),
        item("Gunnm - Tome 4", { thumbnail: null }),
        item("Gunnm - Tome 12"),
      ],
      { title: "Gunnm", total: 9 }
    );
    expect([...picked.keys()]).toEqual([1]);
  });

  it("reads the number from the title when a volume subtitle follows", () => {
    const picked = pickVolumes(
      [item("One Piece - Édition originale - Tome 01", { subtitle: "À l'aube d'une grande aventure" }), item("Gunnm", { subtitle: "Tome 2" })],
      { title: "One Piece", total: 113 }
    );
    expect([...picked.keys()]).toEqual([1]);
    expect(pickVolumes([item("Gunnm", { subtitle: "Tome 2" })], { title: "Gunnm", total: 9 }).has(2)).toBe(true);
  });

  it("prefers the standard edition over the Édition originale", () => {
    const picked = pickVolumes(
      [item("Gunnm - Édition originale - Tome 2", { isbn13: "orig" }), item("Gunnm - Tome 2", { isbn13: "std" })],
      { title: "Gunnm", total: 9 }
    );
    expect(picked.get(2)?.isbn13).toBe("std");
  });

  it("falls back to the Édition originale when it is the only one", () => {
    const picked = pickVolumes([item("Gunnm - Édition originale - Tome 2", { isbn13: "orig" })], { title: "Gunnm", total: 9 });
    expect(picked.get(2)).toMatchObject({ isbn13: "orig", original: true });
  });
});

describe("volumeCoversMode", () => {
  it("is off unless configured, and a request can only lower it", () => {
    expect(volumeCoversMode(undefined, "on")).toBe("off");
    expect(volumeCoversMode("dry_run", "on")).toBe("dry_run");
    expect(volumeCoversMode("on", "dry_run")).toBe("dry_run");
    expect(volumeCoversMode("on", null)).toBe("on");
  });
});

describe("runVolumeCovers", () => {
  function deps(over: Partial<VolumeCoversDeps> = {}) {
    const inserted: number[] = [];
    let clock = 0;
    const d: VolumeCoversDeps = {
      targets: async () => [{ id: "s", title: "Gunnm", publisher: "Glénat", total: 3, known: new Set([1]) }],
      search: async () => [item("Gunnm - Tome 1"), item("Gunnm - Tome 2"), item("Gunnm - Tome 3")],
      cacheCover: async (_url, isbn) => `https://storage/${isbn}`,
      insert: async (row) => (inserted.push(row.volume_number), "inserted"),
      now: () => (clock += 10),
      pause: async () => {},
      ...over,
    };
    return { d, inserted };
  }
  const limits = { maxWrites: 100, deadlineMs: 10_000, pagesPerQuery: 2 };

  it("writes only volumes not already known", async () => {
    const { d, inserted } = deps();
    const report = await runVolumeCovers("on", d, limits);
    expect(inserted.sort()).toEqual([2, 3]);
    expect(report.written).toBe(2);
  });

  it("writes nothing in dry run or when off", async () => {
    for (const mode of ["dry_run", "off"] as const) {
      const { d, inserted } = deps();
      await runVolumeCovers(mode, d, limits);
      expect(inserted).toEqual([]);
    }
  });

  it("stops at the write budget", async () => {
    const { d, inserted } = deps();
    const report = await runVolumeCovers("on", d, { ...limits, maxWrites: 1 });
    expect(inserted).toHaveLength(1);
    expect(report.stoppedBy).toBe("write_budget");
  });

  it("reports an unavailable API without writing", async () => {
    const { d, inserted } = deps({ search: async () => null });
    const report = await runVolumeCovers("on", d, limits);
    expect(inserted).toEqual([]);
    expect(report.series[0].apiFailed).toBe(true);
  });

  it("skips a volume whose cover could not be cached", async () => {
    const { d, inserted } = deps({ cacheCover: async () => null });
    await runVolumeCovers("on", d, limits);
    expect(inserted).toEqual([]);
  });
});
