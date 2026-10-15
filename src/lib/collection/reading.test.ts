import { describe, it, expect } from "vitest";
import {
  buildShelves,
  nextToRead,
  pickHome,
  readerCounts,
  type Reading,
  type SeriesMeta,
  type SeriesShelf,
} from "./reading";
import type { OwnedVolume } from "./value";

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

function shelf(partial: Partial<SeriesShelf> & { title: string }): SeriesShelf {
  return {
    manga_id: partial.title,
    slug: partial.title.toLowerCase(),
    cover_url: null,
    owned: [],
    borrowed: [],
    read: [],
    reading: [],
    lastFinished: null,
    ...partial,
  };
}

describe("nextToRead", () => {
  it("proposes the volume after the last one read, not after the last one owned", () => {
    // 12 read, 14 at home : the reader continues with 13
    const s = shelf({ title: "One Piece", owned: range(1, 14), read: range(1, 12) });
    expect(nextToRead(s)).toEqual({ kind: "next", volume: 13 });
  });

  it("puts a volume in progress first", () => {
    const s = shelf({ title: "Frieren", owned: range(1, 5), read: range(1, 3), reading: [5] });
    expect(nextToRead(s)).toEqual({ kind: "reading", volume: 5 });
  });

  it("starts with the lowest volume at home when nothing is read", () => {
    expect(nextToRead(shelf({ title: "DB", owned: [3, 4] }))).toEqual({ kind: "next", volume: 3 });
  });

  it("flags a missing volume instead of silently skipping it", () => {
    const s = shelf({ title: "CSM", owned: [1, 2, 3, 4, 6, 7], read: range(1, 4) });
    expect(nextToRead(s)).toEqual({ kind: "gap", missing: 5, available: 6 });
  });

  it("continues after a volume read elsewhere", () => {
    // 5 was read at the library, never owned
    const s = shelf({ title: "CSM", owned: [1, 2, 3, 4, 6], read: range(1, 5) });
    expect(nextToRead(s)).toEqual({ kind: "next", volume: 6 });
  });

  it("proposes nothing when everything at home is read", () => {
    expect(nextToRead(shelf({ title: "Kaiju", owned: range(1, 3), read: range(1, 3) }))).toBeNull();
  });

  it("never proposes an unread volume before the last one read", () => {
    const s = shelf({ title: "X", owned: [1, 2, 3], read: [1, 3] });
    expect(nextToRead(s)).toBeNull();
  });
});

describe("pickHome", () => {
  it("shows volumes in progress first, alphabetically, the others as 'also reading'", () => {
    const pick = pickHome([
      shelf({ title: "Spy × Family", owned: range(1, 9), reading: [8] }),
      shelf({ title: "Frieren", owned: range(1, 5), reading: [5] }),
      shelf({ title: "One Piece", owned: range(1, 14), read: range(1, 12), lastFinished: "2026-10-01" }),
    ]);
    expect(pick.main?.shelf.title).toBe("Frieren");
    expect(pick.alsoReading.map((x) => `${x.shelf.title} ${x.volume}`)).toEqual(["Spy × Family 8"]);
  });

  it("otherwise suggests the series read most recently, unknown dates last", () => {
    const pick = pickHome([
      shelf({ title: "A", owned: range(1, 3), read: [1] }),
      shelf({ title: "B", owned: range(1, 3), read: [1], lastFinished: "2026-09-01" }),
      shelf({ title: "C", owned: range(1, 3), read: [1], lastFinished: "2026-10-01" }),
    ]);
    expect(pick.main?.shelf.title).toBe("C");
  });

  it("has nothing to show when everything is read", () => {
    expect(pickHome([shelf({ title: "K", owned: [1], read: [1] })]).main).toBeNull();
  });
});

describe("buildShelves + readerCounts", () => {
  const series: SeriesMeta[] = [
    { manga_id: "bl", title: "Blue Lock", slug: "blue-lock", cover_url: null },
    { manga_id: "op", title: "One Piece", slug: "one-piece", cover_url: null },
  ];
  const v = (manga_id: string, volume_number: number, acquisition_type: OwnedVolume["acquisition_type"] = "bought"): OwnedVolume => ({
    manga_id,
    volume_number,
    price_eur: null,
    acquisition_type,
    acquired_at: null,
  });
  const r = (manga_id: string, volume_number: number, status: Reading["status"] = "read"): Reading => ({
    manga_id,
    volume_number,
    status,
    finished_on: null,
  });

  it("counts every reading, including volumes given back or read elsewhere", () => {
    // Blue Lock 1-4 were borrowed then returned : no volume row left
    const shelves = buildShelves(series, [v("bl", 5), v("op", 1), v("op", 2)], [r("bl", 1), r("bl", 2), r("bl", 3), r("bl", 4), r("op", 1)]);
    expect(readerCounts(shelves)).toEqual({ volumesRead: 5, waitingAtHome: 2 });
  });

  it("counts borrowed volumes still at home as waiting, and in-progress ones too", () => {
    const shelves = buildShelves(series, [v("bl", 1, "borrowed"), v("op", 1, null)], [r("op", 1, "reading")]);
    expect(readerCounts(shelves)).toEqual({ volumesRead: 0, waitingAtHome: 2 });
    expect(shelves[0].borrowed).toEqual([1]);
  });
});
