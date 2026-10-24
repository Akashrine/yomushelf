// Nightly fill of the series covers of the curated catalogue (Découvrir).
// A series added by an editorial migration has no cover yet :
// 1. its MyAnimeList id, when known : the official API by exact id, never
//    a title search that could pick another series ;
// 2. only when the series has no MyAnimeList id, or MyAnimeList has no
//    picture for it : the French volume 1 on Google Books, matched as
//    strictly as the volume covers (see volume-covers.ts) and from the
//    same publisher.
// A MyAnimeList entry the import rules refuse (content flag) gets no cover
// and is reported : the series needs a human look. When MyAnimeList does
// not answer, the series waits for the next night : never a title search
// in its place.
// Bounded by a deadline and a series budget ; the next night goes on.

export type CoverTarget = { id: string; title: string; total: number | null; malId: number | null; publisher: string | null };

export type CatalogueCoversDeps = {
  targets: () => Promise<CoverTarget[]>;
  malCover: (malId: number) => Promise<string | "refused" | null>;
  bookCover: (target: CoverTarget) => Promise<string | null>;
  cache: (url: string, mangaId: string) => Promise<string | null>;
  save: (mangaId: string, coverUrl: string) => Promise<boolean>; // false : it had a cover meanwhile
  now: () => number;
  pause: () => Promise<void>;
};

export type CatalogueCoversLimits = { maxSeries: number; deadlineMs: number };

export type CatalogueCoversReport = {
  checked: number;
  written: number;
  refused: string[]; // MyAnimeList refuses the entry : check the series
  unanswered: string[]; // MyAnimeList did not answer : next night
  missing: string[]; // no cover found anywhere
  stoppedBy: "done" | "deadline" | "series_budget";
};

export async function runCatalogueCovers(deps: CatalogueCoversDeps, limits: CatalogueCoversLimits): Promise<CatalogueCoversReport> {
  const report: CatalogueCoversReport = { checked: 0, written: 0, refused: [], unanswered: [], missing: [], stoppedBy: "done" };
  const started = deps.now();
  for (const target of await deps.targets()) {
    if (report.checked >= limits.maxSeries) {
      report.stoppedBy = "series_budget";
      break;
    }
    if (deps.now() - started > limits.deadlineMs) {
      report.stoppedBy = "deadline";
      break;
    }
    report.checked++;
    let remote: string | null = null;
    if (target.malId != null) {
      const found = await deps.malCover(target.malId).catch(() => "unanswered" as const);
      if (found === "refused" || found === "unanswered") {
        report[found].push(target.title);
        await deps.pause();
        continue;
      }
      remote = found;
    }
    if (!remote) remote = await deps.bookCover(target).catch(() => null);
    const cached = remote ? await deps.cache(remote, target.id).catch(() => null) : null;
    if (!cached) report.missing.push(target.title);
    else if (await deps.save(target.id, cached)) report.written++;
    await deps.pause();
  }
  return report;
}
