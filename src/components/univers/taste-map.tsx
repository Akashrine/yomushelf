"use client";

import { useState } from "react";
import Link from "next/link";
import { AppIcon } from "@/components/app/app-icon";
import { Cover } from "@/components/collection/reader-home";
import type { TerritoryTaste } from "@/lib/discovery/suggest";
import type { TerritoryKey } from "@/lib/discovery/territories";

export type MapDiscovery = { id: string; title: string; cover_url: string | null };

// Level in words : the map never relies on colour or size alone.
function level(t: TerritoryTaste): string {
  if (t.share >= 0.3) return "Beaucoup";
  if (t.share >= 0.12) return "Un peu";
  if (t.share > 0) return "À peine";
  return "Pas encore";
}

export function TasteMap({
  territories,
  discoveries,
  uncounted,
}: {
  territories: TerritoryTaste[];
  discoveries: Partial<Record<TerritoryKey, MapDiscovery[]>>;
  uncounted: number; // series without known genres, left out of the map
}) {
  const hasSignal = territories.some((t) => t.share > 0);
  const strongest = [...territories].sort((a, b) => b.share - a.share)[0];
  const [open, setOpen] = useState<TerritoryKey | null>(hasSignal ? strongest.key : null);
  const selected = territories.find((t) => t.key === open) ?? null;
  const top = Math.max(...territories.map((t) => t.share), 0.0001);

  return (
    <div className="flex flex-col gap-4">
      {!hasSignal && (
        <p className="rounded-2xl p-4 text-sm" style={{ background: "var(--surface)", color: "var(--muted)" }}>
          Ta carte se remplit quand tu notes tes lectures, dis ce que tu as aimé, ou choisis tes genres préférés dans{" "}
          <Link href="/decouvrir#mes-gouts" className="underline underline-offset-4">Découvrir</Link>. En attendant, explore un territoire.
        </p>
      )}

      <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3" aria-label="Territoires de la carte des goûts">
        {territories.map((t) => {
          const on = open === t.key;
          return (
            <li key={t.key}>
              <button
                type="button"
                aria-expanded={on}
                aria-controls="taste-panel"
                onClick={() => setOpen(on ? null : t.key)}
                className="flex h-full min-h-24 w-full flex-col items-start gap-1 rounded-2xl p-3 text-left"
                style={{
                  background: on ? "color-mix(in srgb, var(--sleep) 16%, var(--surface))" : "var(--surface)",
                  border: `1.5px solid ${on ? "var(--sleep)" : "var(--border)"}`,
                }}
              >
                <span className="text-base font-bold leading-tight">{t.label}</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>{t.hint}</span>
                <span className="mt-auto flex w-full items-center gap-2 pt-1">
                  <span className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "var(--background)" }} aria-hidden="true">
                    <span className="block h-full rounded-full" style={{ width: `${(t.share / top) * 100}%`, background: "var(--sleep)" }} />
                  </span>
                  <span className="text-xs font-semibold">{level(t)}</span>
                </span>
                {(t.declared || t.avoided) && (
                  <span className="text-xs font-semibold" style={{ color: t.avoided ? "var(--muted)" : "var(--read)" }}>
                    {t.avoided ? "Tu préfères éviter" : "Tu as dit aimer"}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {selected && (
        <div id="taste-panel" role="region" aria-label={selected.label} className="flex flex-col gap-4 rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div>
            <h3 className="text-base font-bold">{selected.label}</h3>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{selected.hint}</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">
              {selected.series.length ? `Tes séries ici (${selected.series.length})` : "Tu n'as pas encore de série ici."}
            </p>
            {selected.series.length > 0 && (
              <ul className="flex flex-col gap-1">
                {selected.series.slice(0, 8).map((s) => (
                  <li key={s.manga_id}>
                    <Link href={`/bibliotheque/${s.manga_id}`} className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-2 hover:underline">
                      <span className="font-semibold">{s.title}</span>
                      <span className="shrink-0 text-xs" style={{ color: "var(--muted)" }}>
                        {[s.liked === true ? "aimée" : s.liked === false ? "pas pour toi" : null, s.read ? `${s.read} lu${s.read > 1 ? "s" : ""}` : null, s.owned ? `${s.owned} chez toi` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">À découvrir ici</p>
            {(discoveries[selected.key] ?? []).length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>Rien de nouveau à te proposer ici pour l&apos;instant.</p>
            ) : (
              <ul className="grid grid-cols-3 gap-3">
                {(discoveries[selected.key] ?? []).map((d) => (
                  <li key={d.id}>
                    <Link href={`/bibliotheque/${d.id}`} className="flex flex-col gap-1.5">
                      <span className="block aspect-[2/3] w-full">
                        <Cover shelf={{ manga_id: d.id, title: d.title, cover_url: d.cover_url }} volume={1} full />
                      </span>
                      <span className="text-sm font-semibold leading-snug">{d.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/decouvrir" className="mt-3 flex min-h-11 items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--read)" }}>
              <AppIcon name="compass" size={16} /> Plus d&apos;idées dans Découvrir
            </Link>
          </div>
        </div>
      )}

      <details className="text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center" style={{ color: "var(--muted)" }}>Comment la carte est calculée</summary>
        <ul className="mt-1 flex list-disc flex-col gap-1 pl-5" style={{ color: "var(--muted)" }}>
          <li>Chaque série compte autant, qu&apos;elle ait 3 ou 100 tomes.</li>
          <li>Une série dont tu as lu au moins un tome compte 1, une série seulement possédée compte peu (un quart).</li>
          <li>« J&apos;ai aimé » ajoute 1. « Pas pour moi » la retire du calcul.</li>
          <li>Chaque genre que tu dis aimer compte comme une série.</li>
          <li>Une série touchant plusieurs territoires se partage entre eux.</li>
          {uncounted > 0 && <li>{uncounted} série{uncounted > 1 ? "s" : ""} sans genre connu ne compte{uncounted > 1 ? "nt" : ""} pas.</li>}
        </ul>
      </details>
    </div>
  );
}
