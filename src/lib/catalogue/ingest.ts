// Nightly catalogue import from the MyAnimeList ranking — pure logic, the
// database and the provider are injected (see the cron route and tests).
//
// Modes (CRON_INGEST_MODE) :
//   off      (default, also when unset) : nothing is read or written
//   dry_run  : reads and plans, writes nothing, reports what it would do
//   on       : writes, within explicit limits
// Rules : editorial rows keep their data (at most a missing cover is
// filled) ; a series already known under the same title or alias is never
// inserted again ; at most maxWrites rows and maxCovers downloads per run.

import { titleKey } from "@/lib/manga-api/merge";
import type { MangaSearchResult } from "@/lib/manga-api/types";

export type IngestMode = "off" | "dry_run" | "on";

export function ingestMode(raw: string | undefined, requested: string | null): IngestMode {
  const env: IngestMode = raw === "on" ? "on" : raw === "dry_run" ? "dry_run" : "off";
  // A manual call may ask for a dry run, never for more than the env allows.
  if (requested === "dry_run") return "dry_run";
  return env;
}

export type ExistingRow = {
  id: string;
  updated_at: string;
  cover_url: string | null;
  curated: boolean;
  external_ids: Record<string, unknown>;
};

export type IngestRepo = {
  findByMalId(malId: number): Promise<ExistingRow | null>;
  // Titles and aliases of shared series that could match these names.
  namesLike(names: string[]): Promise<{ title: string; aliases: string[] }[]>;
  insert(row: Record<string, unknown>): Promise<void>;
  update(id: string, row: Record<string, unknown>): Promise<void>;
};

export type IngestDeps = {
  ranking: () => Promise<MangaSearchResult[]>;
  repo: IngestRepo;
  cacheCover: (url: string, id: string) => Promise<string | null>;
  newId: () => string;
  now: () => number;
};

export type IngestLimits = { maxWrites: number; maxCovers: number; deadlineMs: number };

export type PlannedAction = { action: "insert" | "update" | "fill_cover"; title: string; mal_id: number };

export type IngestReport = {
  mode: IngestMode;
  considered: number;
  planned: PlannedAction[];
  written: number;
  skipped: { duplicate: number; fresh: number; editorial: number; over_limit: number };
  errors: number;
  stopped_early: boolean;
};

const DAY = 86_400_000;

export async function runIngest(mode: IngestMode, deps: IngestDeps, limits: IngestLimits): Promise<IngestReport> {
  const report: IngestReport = {
    mode,
    considered: 0,
    planned: [],
    written: 0,
    skipped: { duplicate: 0, fresh: 0, editorial: 0, over_limit: 0 },
    errors: 0,
    stopped_early: false,
  };
  if (mode === "off") return report;

  const started = deps.now();
  const ranking = await deps.ranking();
  let covers = 0;

  for (const manga of ranking) {
    if (deps.now() - started > limits.deadlineMs) {
      report.stopped_early = true;
      break;
    }
    const malId = manga.external_ids.mal_id;
    if (malId == null) continue;
    report.considered++;
    try {
      const existing = await deps.repo.findByMalId(malId);

      // Editorial rows : at most fill a missing cover.
      if (existing?.curated) {
        if (!existing.cover_url && manga.cover_url) {
          if (report.planned.length >= limits.maxWrites || covers >= limits.maxCovers) {
            report.skipped.over_limit++;
            continue;
          }
          report.planned.push({ action: "fill_cover", title: manga.title, mal_id: malId });
          if (mode === "on") {
            covers++;
            const cover = await deps.cacheCover(manga.cover_url, existing.id);
            if (cover) {
              await deps.repo.update(existing.id, { cover_url: cover });
              report.written++;
            }
          }
        } else {
          report.skipped.editorial++;
        }
        continue;
      }

      if (!existing) {
        const names = [manga.title, manga.title_fr].filter((t): t is string => Boolean(t));
        const keys = names.map(titleKey);
        const candidates = await deps.repo.namesLike(names);
        if (candidates.some((r) => [r.title, ...r.aliases].some((t) => keys.includes(titleKey(t))))) {
          report.skipped.duplicate++;
          continue;
        }
      } else if (deps.now() - new Date(existing.updated_at).getTime() < DAY) {
        report.skipped.fresh++;
        continue;
      }

      if (report.planned.length >= limits.maxWrites) {
        report.skipped.over_limit++;
        continue;
      }
      report.planned.push({ action: existing ? "update" : "insert", title: manga.title, mal_id: malId });
      if (mode !== "on") continue;

      const id = existing?.id ?? deps.newId();
      let cover_url = existing?.cover_url ?? null;
      if (manga.cover_url && !cover_url && covers < limits.maxCovers) {
        covers++;
        cover_url = await deps.cacheCover(manga.cover_url, id);
      }
      const row = {
        title: manga.title.slice(0, 300),
        author: manga.author,
        total_volumes: manga.total_volumes != null && manga.total_volumes <= 500 ? manga.total_volumes : null,
        status: manga.status,
        genre_primary: manga.genre_primary,
        cover_url,
        // keep every id already known (merges, ISBN…), add the MAL one
        external_ids: { ...(existing?.external_ids ?? {}), mal_id: malId },
      };
      if (existing) await deps.repo.update(existing.id, row);
      else await deps.repo.insert({ id, ...row, is_top_50_fr: false });
      report.written++;
    } catch {
      report.errors++;
    }
  }
  return report;
}
