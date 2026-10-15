// Reader space helpers — pure functions, shared by server pages and tests.
// Reading is independent from ownership: a volume read elsewhere counts,
// a volume given back keeps its reading.

import type { ReadingStatus } from "@/lib/types/database";
import { volumeKey, type OwnedVolume, type ReadIndex } from "./value";

export type Reading = {
  manga_id: string;
  volume_number: number;
  status: ReadingStatus;
  finished_on: string | null; // YYYY-MM-DD, null = unknown
};

export type SeriesMeta = {
  manga_id: string;
  title: string;
  slug: string;
  cover_url: string | null;
};

export type SeriesShelf = SeriesMeta & {
  owned: number[]; // every volume at home, borrowed ones included
  borrowed: number[];
  read: number[];
  reading: number[];
  lastFinished: string | null; // most recent known finished_on
};

const asc = (a: number, b: number) => a - b;
const byTitle = (a: SeriesMeta, b: SeriesMeta) => a.title.localeCompare(b.title, "fr");

export function buildShelves(
  series: SeriesMeta[],
  volumes: OwnedVolume[],
  readings: Reading[]
): SeriesShelf[] {
  return series.map((s) => {
    const vs = volumes.filter((v) => v.manga_id === s.manga_id);
    const rs = readings.filter((r) => r.manga_id === s.manga_id);
    const finished = rs
      .filter((r) => r.status === "read" && r.finished_on)
      .map((r) => r.finished_on as string)
      .sort();
    return {
      ...s,
      owned: vs.map((v) => v.volume_number).sort(asc),
      borrowed: vs.filter((v) => v.acquisition_type === "borrowed").map((v) => v.volume_number).sort(asc),
      read: rs.filter((r) => r.status === "read").map((r) => r.volume_number).sort(asc),
      reading: rs.filter((r) => r.status === "reading").map((r) => r.volume_number).sort(asc),
      lastFinished: finished.length ? finished[finished.length - 1] : null,
    };
  });
}

// ─────────────────────────────────────────
// What to read next in one series
//   1. a volume in progress
//   2. N = highest read + 1 (or the lowest owned when nothing is read)
//      - N at home and unread            → propose N
//      - N missing, a later one at home → say N is missing (gap)
//      - nothing at home after N        → nothing to propose
// Unread volumes before the last read one are never proposed.
// ─────────────────────────────────────────

export type Candidate =
  | { kind: "reading"; volume: number }
  | { kind: "next"; volume: number }
  | { kind: "gap"; missing: number; available: number };

export function nextToRead(shelf: SeriesShelf): Candidate | null {
  if (shelf.reading.length) return { kind: "reading", volume: shelf.reading[0] };
  if (!shelf.owned.length) return null;

  const read = new Set(shelf.read);
  const owned = new Set(shelf.owned);
  const n = shelf.read.length ? Math.max(...shelf.read) + 1 : shelf.owned[0];
  if (owned.has(n) && !read.has(n)) return { kind: "next", volume: n };

  const available = shelf.owned.find((v) => v > n && !read.has(v));
  if (available != null) return { kind: "gap", missing: n, available };
  return null;
}

// Volume number the reader would act on for this candidate.
export const candidateVolume = (c: Candidate) => (c.kind === "gap" ? c.available : c.volume);

// ─────────────────────────────────────────
// Home : one main card + the other volumes in progress
// ─────────────────────────────────────────

export type HomePick = {
  main: { shelf: SeriesShelf; candidate: Candidate } | null;
  alsoReading: { shelf: SeriesShelf; volume: number }[];
};

export function pickHome(shelves: SeriesShelf[]): HomePick {
  const inProgress = shelves.filter((s) => s.reading.length).sort(byTitle);
  if (inProgress.length) {
    const [first, ...rest] = inProgress;
    return {
      main: { shelf: first, candidate: { kind: "reading", volume: first.reading[0] } },
      alsoReading: rest.map((s) => ({ shelf: s, volume: s.reading[0] })),
    };
  }

  // Most recently finished first; unknown dates last; then by title.
  const open = shelves
    .map((shelf) => ({ shelf, candidate: nextToRead(shelf) }))
    .filter((x): x is { shelf: SeriesShelf; candidate: Candidate } => x.candidate != null)
    .sort((a, b) => {
      const da = a.shelf.lastFinished ?? "";
      const db = b.shelf.lastFinished ?? "";
      return db.localeCompare(da) || byTitle(a.shelf, b.shelf);
    });
  return { main: open[0] ?? null, alsoReading: [] };
}

// ─────────────────────────────────────────
// Counters
// ─────────────────────────────────────────

export function readerCounts(shelves: SeriesShelf[]) {
  let volumesRead = 0;
  let waitingAtHome = 0;
  for (const s of shelves) {
    volumesRead += s.read.length;
    const read = new Set(s.read);
    waitingAtHome += s.owned.filter((v) => !read.has(v)).length;
  }
  return { volumesRead, waitingAtHome };
}

// Read volumes in a stable order, for the pile drawing.
export function readSpines(shelves: SeriesShelf[]) {
  return [...shelves]
    .sort(byTitle)
    .flatMap((s) => s.read.map((volume) => ({ manga_id: s.manga_id, volume })));
}

export function readIndex(readings: Reading[]): ReadIndex {
  const finished = new Map<string, string | null>();
  for (const r of readings) {
    if (r.status !== "read") continue;
    finished.set(volumeKey(r.manga_id, r.volume_number), r.finished_on?.slice(0, 7) ?? null);
  }
  return {
    has: (key) => finished.has(key),
    finishedMonth: (key) => finished.get(key) ?? null,
  };
}
