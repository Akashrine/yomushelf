// Nightly fill of the `volumes` table : French-edition ISBN and cover for
// each volume of the series readers actually have (Google Books).
//
// Google Books answers 503 at random and rate-limits bursts, so the job is
// slow (one call at a time, a pause between calls), bounded by a deadline
// and a write budget, and simply picks up where it stopped the next night.
// It never rewrites a known volume.
//
// Matching is strict : "<series> - Tome 07", "<series> T07", "<series> 7",
// optionally "<series> - Édition originale - Tome 07". Anything else between
// the series name and the number (spin-offs like "Gunnm Last Order",
// "Blue Lock - Episode Nagi", collector or perfect editions) is ignored.

import type { GoogleBooksItem } from "@/lib/manga-api/google-books";

export type VolumeCoversMode = "off" | "dry_run" | "on";

export type TargetSeries = {
  id: string;
  title: string;
  publisher: string | null;
  total: number;
  known: Set<number>; // volume numbers already in `volumes`
};

export type VolumeCandidate = {
  volume: number;
  isbn13: string;
  thumbnail: string;
  original: boolean; // "Édition originale" : used only when nothing else exists
};

export type VolumeCoversDeps = {
  targets: () => Promise<TargetSeries[]>;
  search: (query: string, startIndex: number) => Promise<GoogleBooksItem[] | null>;
  cacheCover: (url: string, isbn13: string) => Promise<string | null>;
  insert: (row: { manga_id: string; volume_number: number; isbn_13: string; cover_url: string }) => Promise<"inserted" | "duplicate">;
  now: () => number;
  pause: () => Promise<void>;
};

export type VolumeCoversLimits = { maxWrites: number; deadlineMs: number; pagesPerQuery: number };

export type VolumeCoversReport = {
  mode: VolumeCoversMode;
  series: { title: string; found: number; missingBefore: number; written: number; apiFailed: boolean }[];
  written: number;
  stoppedBy: "done" | "deadline" | "write_budget";
};

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function parseVolumeTitle(fullTitle: string, seriesTitle: string): { volume: number; original: boolean } | null {
  const title = normalize(fullTitle);
  const series = normalize(seriesTitle);
  if (!series || !title.startsWith(`${series} `)) return null;
  const rest = title.slice(series.length).trim();
  const m = rest.match(/^(edition originale )?(?:tome |t|vol |volume )?0*(\d{1,3})$/);
  if (!m) return null;
  const volume = Number(m[2]);
  return volume > 0 ? { volume, original: Boolean(m[1]) } : null;
}

// Best candidate per volume number : French, with ISBN and cover, within the
// series length ; the standard edition wins over "Édition originale".
export function pickVolumes(items: GoogleBooksItem[], series: Pick<TargetSeries, "title" | "total">): Map<number, VolumeCandidate> {
  const best = new Map<number, VolumeCandidate>();
  for (const item of items) {
    if (item.language && item.language !== "fr") continue;
    if (!item.isbn13 || !item.thumbnail) continue;
    // the title alone first ("One Piece - Tome 01" + subtitle "À l'aube…"),
    // then with the subtitle when the number sits there ("Gunnm" + "Tome 2")
    const parsed =
      parseVolumeTitle(item.title, series.title) ??
      (item.subtitle ? parseVolumeTitle(`${item.title} ${item.subtitle}`, series.title) : null);
    if (!parsed || parsed.volume > series.total) continue;
    const previous = best.get(parsed.volume);
    if (!previous || (previous.original && !parsed.original)) {
      best.set(parsed.volume, { volume: parsed.volume, isbn13: item.isbn13, thumbnail: item.thumbnail, original: parsed.original });
    }
  }
  return best;
}

export function volumeCoversMode(env: string | undefined, requested: string | null): VolumeCoversMode {
  const configured: VolumeCoversMode = env === "on" ? "on" : env === "dry_run" ? "dry_run" : "off";
  // a request can only lower the mode (on → dry_run), never raise it
  return configured === "on" && requested === "dry_run" ? "dry_run" : configured;
}

export async function runVolumeCovers(
  mode: VolumeCoversMode,
  deps: VolumeCoversDeps,
  limits: VolumeCoversLimits
): Promise<VolumeCoversReport> {
  const report: VolumeCoversReport = { mode, series: [], written: 0, stoppedBy: "done" };
  if (mode === "off") return report;
  const start = deps.now();
  const timeLeft = () => deps.now() - start < limits.deadlineMs;

  for (const series of await deps.targets()) {
    const missingBefore = series.total - series.known.size;
    if (missingBefore <= 0) continue;
    if (!timeLeft()) { report.stoppedBy = "deadline"; break; }

    const items: GoogleBooksItem[] = [];
    let apiFailed = false;
    const queries = [`${series.title} tome`, `${series.title} ${(series.publisher ?? "").split(/[ (]/)[0]}`.trim()];
    for (const query of new Set(queries)) {
      for (let page = 0; page < limits.pagesPerQuery && timeLeft(); page++) {
        const batch = await deps.search(query, page * 40);
        await deps.pause();
        if (batch === null) { apiFailed = true; break; }
        items.push(...batch);
        if (batch.length < 40) break;
      }
    }

    const candidates = [...pickVolumes(items, series).values()].filter((c) => !series.known.has(c.volume));
    let written = 0;
    for (const c of candidates) {
      if (report.written >= limits.maxWrites) { report.stoppedBy = "write_budget"; break; }
      if (!timeLeft()) { report.stoppedBy = "deadline"; break; }
      if (mode === "dry_run") { written++; continue; }
      const cover = await deps.cacheCover(c.thumbnail, c.isbn13);
      if (!cover) continue;
      if ((await deps.insert({ manga_id: series.id, volume_number: c.volume, isbn_13: c.isbn13, cover_url: cover })) === "inserted") {
        written++;
        report.written++;
      }
    }
    report.series.push({ title: series.title, found: candidates.length, missingBefore, written, apiFailed });
    if (report.stoppedBy !== "done") break;
  }
  return report;
}
