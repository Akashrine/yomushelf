// Nightly fill of "En images" on the series page : illustrations of each
// catalogue series, from MyAnimeList, copied into our Storage.
//
// The series is matched on MyAnimeList by title AND author : a title alone
// matched the wrong series before (Animal Crossing, Kirby). No author, or
// no author match : nothing is written, the series is only marked checked.
// Every series is checked once ; a new try happens after RECHECK_DAYS.

export const RECHECK_DAYS = 30;
export const MAX_PICTURES = 8;

export type PictureTarget = { id: string; title: string; author: string | null; malId: number | null };
export type MalHit = { malId: number; title: string; author: string | null };

export type MangaPicturesDeps = {
  targets: () => Promise<PictureTarget[]>;
  search: (title: string) => Promise<MalHit[] | null>; // null : API failure
  pictures: (malId: number) => Promise<string[] | null>; // large picture URLs ; null : API failure
  cache: (url: string, mangaId: string, index: number) => Promise<string | null>;
  save: (mangaId: string, update: { pictures: string[] | null; malId: number | null }) => Promise<void>;
  now: () => number;
  pause: () => Promise<void>;
};

export type MangaPicturesReport = {
  series: { title: string; malId: number | null; pictures: number; outcome: "written" | "no_match" | "no_pictures" | "api_failed" }[];
  stoppedBy: "done" | "deadline" | "series_budget";
};

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// "Oda Eiichiro" (MyAnimeList) and "Eiichirō Oda" (catalogue) are the same
// author : one name part of 3 letters or more in common is enough.
export function authorMatches(catalogue: string | null, mal: string | null): boolean {
  if (!catalogue || !mal) return false;
  const parts = (s: string) => new Set(normalize(s).split(" ").filter((p) => p.length >= 3));
  const a = parts(catalogue);
  return [...parts(mal)].some((p) => a.has(p));
}

export function pickMalMatch(target: PictureTarget, hits: MalHit[]): MalHit | null {
  return hits.find((h) => authorMatches(target.author, h.author)) ?? null;
}

export async function runMangaPictures(
  deps: MangaPicturesDeps,
  limits: { maxSeries: number; deadlineMs: number }
): Promise<MangaPicturesReport> {
  const start = deps.now();
  const report: MangaPicturesReport = { series: [], stoppedBy: "done" };
  const targets = await deps.targets();

  for (const target of targets) {
    if (report.series.length >= limits.maxSeries) {
      report.stoppedBy = "series_budget";
      break;
    }
    if (deps.now() - start > limits.deadlineMs) {
      report.stoppedBy = "deadline";
      break;
    }

    let malId = target.malId;
    if (malId == null) {
      const hits = await deps.search(target.title);
      await deps.pause();
      if (hits == null) {
        report.series.push({ title: target.title, malId: null, pictures: 0, outcome: "api_failed" });
        continue;
      }
      malId = pickMalMatch(target, hits)?.malId ?? null;
      if (malId == null) {
        await deps.save(target.id, { pictures: null, malId: null });
        report.series.push({ title: target.title, malId: null, pictures: 0, outcome: "no_match" });
        continue;
      }
    }

    const urls = await deps.pictures(malId);
    await deps.pause();
    if (urls == null) {
      report.series.push({ title: target.title, malId, pictures: 0, outcome: "api_failed" });
      continue;
    }
    const stored: string[] = [];
    for (const [i, url] of urls.slice(0, MAX_PICTURES).entries()) {
      const cached = await deps.cache(url, target.id, i);
      if (cached) stored.push(cached);
    }
    await deps.save(target.id, { pictures: stored.length ? stored : null, malId });
    report.series.push({ title: target.title, malId, pictures: stored.length, outcome: stored.length ? "written" : "no_pictures" });
  }
  return report;
}
