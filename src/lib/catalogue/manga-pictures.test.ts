import { describe, expect, it, vi } from "vitest";
import { authorMatches, pickMalMatch, runMangaPictures, type MangaPicturesDeps, type PictureTarget } from "./manga-pictures";

describe("authorMatches", () => {
  it("matches names written in another order or with accents", () => {
    expect(authorMatches("Eiichirō Oda", "Oda Eiichiro")).toBe(true);
    expect(authorMatches("Akira Toriyama", "Toriyama Akira")).toBe(true);
  });

  it("refuses another author or an unknown one", () => {
    expect(authorMatches("Eiichirō Oda", "Kishimoto Masashi")).toBe(false);
    expect(authorMatches(null, "Oda Eiichiro")).toBe(false);
  });
});

describe("pickMalMatch", () => {
  it("keeps the first hit by the same author, never the first hit by title alone", () => {
    const target: PictureTarget = { id: "k", title: "Kirby", author: "Hirokazu Hikawa", malId: null };
    const hits = [
      { malId: 1, title: "Kirby", author: "Sakurai Masahiro" },
      { malId: 2, title: "Hoshi no Kirby", author: "Hikawa Hirokazu" },
    ];
    expect(pickMalMatch(target, hits)?.malId).toBe(2);
    expect(pickMalMatch(target, hits.slice(0, 1))).toBeNull();
  });
});

function deps(over: Partial<MangaPicturesDeps> = {}): MangaPicturesDeps {
  return {
    targets: async () => [],
    search: async () => [],
    pictures: async () => [],
    cache: async (url) => `stored:${url}`,
    save: vi.fn(async () => {}),
    now: () => 0,
    pause: async () => {},
    ...over,
  };
}

describe("runMangaPictures", () => {
  const onePiece: PictureTarget = { id: "op", title: "One Piece", author: "Eiichirō Oda", malId: null };

  it("finds the series, caches its pictures and saves them with the MyAnimeList id", async () => {
    const save = vi.fn(async () => {});
    const report = await runMangaPictures(
      deps({
        targets: async () => [onePiece],
        search: async () => [{ malId: 13, title: "One Piece", author: "Oda Eiichiro" }],
        pictures: async () => ["a", "b"],
        save,
      }),
      { maxSeries: 10, deadlineMs: 1000 }
    );
    expect(save).toHaveBeenCalledWith("op", { pictures: ["stored:a", "stored:b"], malId: 13 });
    expect(report.series[0]).toMatchObject({ outcome: "written", pictures: 2 });
  });

  it("only marks the series checked when no hit has the same author", async () => {
    const save = vi.fn(async () => {});
    const report = await runMangaPictures(
      deps({ targets: async () => [onePiece], search: async () => [{ malId: 9, title: "One Piece", author: "Someone Else" }], save }),
      { maxSeries: 10, deadlineMs: 1000 }
    );
    expect(save).toHaveBeenCalledWith("op", { pictures: null, malId: null });
    expect(report.series[0].outcome).toBe("no_match");
  });

  it("writes nothing when the API fails, so the series is tried again", async () => {
    const save = vi.fn(async () => {});
    const report = await runMangaPictures(deps({ targets: async () => [onePiece], search: async () => null, save }), { maxSeries: 10, deadlineMs: 1000 });
    expect(save).not.toHaveBeenCalled();
    expect(report.series[0].outcome).toBe("api_failed");
  });

  it("stops at the series budget", async () => {
    const targets = [onePiece, { ...onePiece, id: "b" }, { ...onePiece, id: "c" }].map((t) => ({ ...t, malId: 13 }));
    const report = await runMangaPictures(deps({ targets: async () => targets, pictures: async () => ["a"] }), { maxSeries: 2, deadlineMs: 1000 });
    expect(report.series).toHaveLength(2);
    expect(report.stoppedBy).toBe("series_budget");
  });
});
