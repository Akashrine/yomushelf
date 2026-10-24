// Nightly fill of the series covers of the curated catalogue (Découvrir).
// A series added by an editorial migration has no cover yet :
// 1. its MyAnimeList id, when known : the official API by exact id, never
//    a title search that could pick another series ;
// 2. otherwise the French volume 1 on Google Books, matched as strictly as
//    the volume covers (see volume-covers.ts).
// A MyAnimeList entry the import rules refuse (content flag) gets no cover
// and is reported : the series needs a human look.
// Bounded by a deadline and a series budget ; the next night goes on.

export type CoverTarget = { id: string; title: string; total: number | null; malId: number | null };

export type CatalogueCoversDeps = {
  targets: () => Promise<CoverTarget[]>;
  malCover: (malId: number) => Promise<string | "refused" | null>;
  bookCover: (title: string, total: number | null) => Promise<string | null>;
  cache: (url: string, mangaId: string) => Promise<string | null>;
  save: (mangaId: string, coverUrl: string) => Promise<void>;
  now: () => number;
  pause: () => Promise<void>;
};

export type CatalogueCoversLimits = { maxSeries: number; deadlineMs: number };

export type CatalogueCoversReport = {
  checked: number;
  written: number;
  refused: string[]; // MyAnimeList refuses the entry : check the series
  missing: string[]; // no cover found anywhere
  stoppedBy: "done" | "deadline" | "series_budget";
};

export async function runCatalogueCovers(deps: CatalogueCoversDeps, limits: CatalogueCoversLimits): Promise<CatalogueCoversReport> {
  const report: CatalogueCoversReport = { checked: 0, written: 0, refused: [], missing: [], stoppedBy: "done" };
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
      const found = await deps.malCover(target.malId).catch(() => null);
      if (found === "refused") {
        report.refused.push(target.title);
        await deps.pause();
        continue;
      }
      remote = found;
    }
    if (!remote) remote = await deps.bookCover(target.title, target.total).catch(() => null);
    const cached = remote ? await deps.cache(remote, target.id).catch(() => null) : null;
    if (cached) {
      await deps.save(target.id, cached);
      report.written++;
    } else {
      report.missing.push(target.title);
    }
    await deps.pause();
  }
  return report;
}
