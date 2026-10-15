"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppIcon } from "@/components/app/app-icon";
import { Cover } from "@/components/collection/reader-home";
import { VolumeSheet, type VolumeSavedEvent } from "@/components/collection/volume-sheet";
import { ReadingToast } from "@/components/collection/reading-toast";
import { useReadingAction, type ReadingIntent } from "@/components/collection/use-reading-action";
import { archiveSeries, deleteSeriesPermanently, restoreSeries } from "@/app/(app)/bibliotheque/actions";
import { addSeriesToLibrary } from "@/app/(app)/ajouter/actions";
import { addWishlistItem } from "@/app/(app)/envies/actions";
import { lastKnownPrice, nextVolumeToBuy, type OwnedVolume } from "@/lib/collection/value";
import { buildShelves, nextToRead, type Reading } from "@/lib/collection/reading";
import { DEMOGRAPHIC_LABELS, GENRE_LABELS } from "@/lib/discovery/suggest";
import type { Demographic } from "@/lib/types/database";

type Manga = {
  id: string;
  title: string;
  author: string | null;
  publisher_fr: string | null;
  total_volumes: number | null;
  status: "ongoing" | "completed" | "paused";
  cover_url: string | null;
  genres: string[];
  demographic: Demographic | null;
  audience_min_age: number | null;
  synopsis: string | null;
  is_private: boolean;
};

export type ShelfPresence = "on_shelf" | "archived" | "absent";

type Props = {
  manga: Manga;
  presence: ShelfPresence;
  volumes: OwnedVolume[];
  readings: Reading[];
  wishedVolumes: number[];
};

const MANGA_STATUS_LABELS = {
  ongoing: "En cours de parution",
  completed: "Série terminée",
  paused: "En pause",
} as const;

const NETWORK_ERROR = "Impossible de confirmer l'enregistrement. Vérifie ta connexion puis réessaie.";

// First volume missing after the lowest one at home : what "J'ai un
// nouveau tome" proposes. Never assumes the earlier volumes are owned.
export function firstMissingVolume(owned: number[]): number {
  if (owned.length === 0) return 1;
  const set = new Set(owned);
  let n = Math.min(...owned);
  while (set.has(n)) n++;
  return n;
}

export function SerieDetail({ manga, presence, volumes, readings, wishedVolumes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openVolume, setOpenVolume] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reading = useReadingAction();

  const shelf = buildShelves(
    [{ manga_id: manga.id, title: manga.title, slug: manga.id, cover_url: manga.cover_url }],
    volumes,
    readings
  )[0];
  const owned = new Map(volumes.map((v) => [v.volume_number, v]));
  const readingByNumber = new Map(readings.map((r) => [r.volume_number, r]));
  const candidate = nextToRead(shelf);
  const highlighted = candidate?.kind === "next" ? candidate.volume : null;

  const totalVolumes = manga.total_volumes ?? 0;
  const highest = Math.max(0, ...shelf.owned, ...shelf.read, ...shelf.reading, ...wishedVolumes);
  const gridCount = totalVolumes > 0 ? Math.max(totalVolumes, highest) : Math.max(highest + 1, 12);
  const toBuy = nextVolumeToBuy(volumes);
  const toBuyIsPublished = totalVolumes === 0 || toBuy <= totalVolumes;
  const toBuyWished = wishedVolumes.includes(toBuy);
  const priceHint = lastKnownPrice(volumes);

  const closeSheet = useCallback(() => setOpenVolume(null), []);

  function act(intent: ReadingIntent, volume: number) {
    reading.run(intent, { mangaId: manga.id, title: manga.title, volume }, () => setOpenVolume(null));
  }

  function handleSaved(event: VolumeSavedEvent) {
    setOpenVolume(null);
    setNotice(
      event.kind === "added"
        ? `Tome ${event.volume} ajouté à ton étagère !`
        : event.kind === "removed"
        ? `Tome ${event.volume} retiré de ton étagère`
        : `Tome ${event.volume} enregistré`
    );
    router.refresh();
  }

  function run(action: () => Promise<{ success: boolean; error?: string }>, after: () => void) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action().catch(() => ({ success: false as const, error: NETWORK_ERROR }));
      if (!result.success) {
        setError(result.error ?? "Pas enregistré. Réessaie.");
        return;
      }
      after();
      router.refresh();
    });
  }

  const form = (fields: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    return fd;
  };

  function handleWish(volume: number) {
    // No price is invented : the wish keeps an unknown price until typed in.
    run(() => addWishlistItem(form({ manga_id: manga.id, volume_number: String(volume) })), () =>
      setNotice(`Tome ${volume} dans tes envies`)
    );
  }

  function handleFollow() {
    run(
      () => addSeriesToLibrary({ series: { source: "db", manga_id: manga.id }, owned: { mode: "none" }, reading: { mode: "none" } }),
      () => setNotice(`${manga.title} est dans ta bibliothèque. Indique les tomes que tu as.`)
    );
  }

  const openVolumeData = openVolume != null ? owned.get(openVolume) ?? null : null;
  const openReading = openVolume != null ? readingByNumber.get(openVolume) ?? null : null;
  const waiting = shelf.owned.filter((v) => !shelf.read.includes(v)).length;
  const onShelf = presence === "on_shelf";

  return (
    <div className="flex flex-col gap-6">
      <Link href="/bibliotheque" className="flex min-h-11 items-center gap-1.5 self-start text-sm" style={{ color: "var(--muted)" }}>
        <AppIcon name="arrow-left" size={16} /> Ma bibliothèque
      </Link>

      {/* Hero */}
      <div className="flex gap-4 sm:gap-6">
        <div className="w-24 shrink-0 sm:w-32" style={{ aspectRatio: "2/3" }}>
          <Cover shelf={{ manga_id: manga.id, title: manga.title, cover_url: manga.cover_url }} volume={Math.max(1, candidate ? (candidate.kind === "gap" ? candidate.available : candidate.volume) : 1)} full />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{manga.title}</h1>
          {onShelf && (
            <p className="mt-1 text-base font-semibold">
              {shelf.read.length} lu{shelf.read.length > 1 ? "s" : ""} · {shelf.owned.length} chez toi
            </p>
          )}
          {manga.author && <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{manga.author}</p>}
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            {[
              MANGA_STATUS_LABELS[manga.status],
              totalVolumes > 0 ? `${totalVolumes} tomes parus` : null,
              manga.audience_min_age != null ? `dès ${manga.audience_min_age} ans` : null,
              manga.publisher_fr,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {(manga.genres.length > 0 || manga.demographic || manga.is_private) && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Genres">
              {manga.is_private && <Chip>Ajoutée par toi</Chip>}
              {manga.demographic && <Chip>{DEMOGRAPHIC_LABELS[manga.demographic]}</Chip>}
              {manga.genres.map((g) => (
                <Chip key={g}>{GENRE_LABELS[g] ?? g}</Chip>
              ))}
            </ul>
          )}
        </div>
      </div>
      {manga.synopsis && <p className="max-w-[65ch] text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{manga.synopsis}</p>}

      {presence === "absent" && (
        <section className="flex flex-col gap-3 rounded-3xl p-4 sm:p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-base font-bold">Pas encore dans ta bibliothèque</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/ajouter?serie=${manga.id}`}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-base font-bold text-white"
              style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))" }}
            >
              <AppIcon name="plus" size={18} strokeWidth={2.5} /> J&apos;ai des tomes
            </Link>
            <button type="button" onClick={handleFollow} disabled={isPending} className="min-h-12 flex-1 rounded-2xl px-4 text-base font-semibold disabled:opacity-60" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
              La suivre sans tome
            </button>
            {!wishedVolumes.includes(1) && (
              <button type="button" onClick={() => handleWish(1)} disabled={isPending} className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl px-4 text-base font-semibold disabled:opacity-60" style={{ background: "rgba(248,192,74,0.12)", color: "var(--gold)" }}>
                <AppIcon name="star" size={16} /> Je veux le tome 1
              </button>
            )}
          </div>
        </section>
      )}

      {presence === "archived" && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl p-4 sm:p-5" style={{ background: "var(--surface)", border: "1px dashed var(--border)" }}>
          <p className="text-sm">
            <strong>Tu as retiré cette série de ta bibliothèque.</strong>{" "}
            <span style={{ color: "var(--muted)" }}>Tes tomes et tes lectures sont gardés.</span>
          </p>
          <button
            type="button"
            onClick={() => run(() => restoreSeries(form({ manga_id: manga.id })), () => setNotice(`${manga.title} est de retour dans ta bibliothèque.`))}
            disabled={isPending}
            className="min-h-11 rounded-xl px-4 text-sm font-bold disabled:opacity-60"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
          >
            La remettre
          </button>
        </section>
      )}

      {onShelf && (
        <>
          <NextCard candidate={candidate} waiting={waiting} ownedCount={shelf.owned.length} pending={reading.isPending} onAct={act} />
          <NewVolumeCard
            mangaId={manga.id}
            suggested={firstMissingVolume(shelf.owned)}
            maxVolume={Math.max(totalVolumes, highest + 50, 100)}
            ownedNumbers={shelf.owned}
            pending={isPending}
            run={run}
            onDone={(n) => setNotice(`Tome ${n} ajouté à ton étagère !`)}
          />
        </>
      )}

      {/* Volume grid */}
      <section aria-labelledby="grid-title">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="grid-title" className="text-base font-bold">Tous les tomes</h2>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Touche un tome pour le lire, l&apos;ajouter ou le corriger.</p>
        </div>
        <div className="grid grid-cols-5 gap-2 min-[420px]:grid-cols-6 sm:grid-cols-8 lg:grid-cols-10">
          {Array.from({ length: gridCount }, (_, i) => i + 1).map((n) => (
            <VolumeTile
              key={n}
              number={n}
              atHome={owned.has(n)}
              borrowed={owned.get(n)?.acquisition_type === "borrowed"}
              status={readingByNumber.get(n)?.status ?? null}
              next={n === highlighted}
              wished={wishedVolumes.includes(n)}
              onOpen={() => setOpenVolume(n)}
            />
          ))}
        </div>
        <Legend />
      </section>

      {error && <p className="text-sm" role="alert" style={{ color: "var(--accent-hover)" }}>{error}</p>}
      {notice && !error && <p className="text-sm font-semibold" role="status" style={{ color: "var(--read)" }}>{notice}</p>}

      {onShelf && (
        <section className="flex flex-col gap-4 rounded-3xl p-4 sm:p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {toBuyIsPublished && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">Le tome {toBuy} n&apos;est pas encore chez toi.</p>
              {toBuyWished ? (
                <Link href="/envies" className="flex min-h-11 items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--gold)" }}>
                  <AppIcon name="star" size={16} filled /> Dans tes envies
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => handleWish(toBuy)}
                  disabled={isPending}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold disabled:opacity-50"
                  style={{ background: "rgba(248,192,74,0.14)", color: "var(--gold)" }}
                >
                  <AppIcon name="star" size={16} /> Je le veux
                </button>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm">Plusieurs tomes d&apos;un coup ?</p>
            <Link
              href={`/ajouter?serie=${manga.id}`}
              className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
            >
              <AppIcon name="plus" size={16} /> Ajouter des tomes
            </Link>
          </div>
          <SeriesOptions title={manga.title} mangaId={manga.id} pending={isPending} run={run} form={form} />
        </section>
      )}

      {openVolume != null && (
        <VolumeSheet
          mangaId={manga.id}
          seriesTitle={manga.title}
          volumeNumber={openVolume}
          existing={openVolumeData}
          reading={openReading ? { status: openReading.status, finished_on: openReading.finished_on } : null}
          suggestedPrice={priceHint}
          readingPending={reading.isPending}
          onReading={(intent) => act(intent, openVolume)}
          onClose={closeSheet}
          onSaved={handleSaved}
        />
      )}
      <ReadingToast toast={reading.toast} onClose={reading.clearToast} />
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
      {children}
    </li>
  );
}

type Runner = (action: () => Promise<{ success: boolean; error?: string }>, after: () => void) => void;

// "J'ai un nouveau tome !" : the first missing volume, adjustable.
function NewVolumeCard({
  mangaId,
  suggested,
  maxVolume,
  ownedNumbers,
  pending,
  run,
  onDone,
}: {
  mangaId: string;
  suggested: number;
  maxVolume: number;
  ownedNumbers: number[];
  pending: boolean;
  run: Runner;
  onDone: (n: number) => void;
}) {
  const [n, setN] = useState(suggested);
  const [alreadyRead, setAlreadyRead] = useState(false);
  const alreadyHere = ownedNumbers.includes(n);
  const clamp = (v: number) => Math.min(Math.max(1, v), maxVolume);

  function add() {
    run(
      () =>
        addSeriesToLibrary({
          series: { source: "db", manga_id: mangaId },
          owned: { mode: "list", volumes: [n] },
          reading: alreadyRead ? { mode: "all_owned" } : { mode: "none" },
          arrived_now: true,
        }),
      () => {
        onDone(n);
        setAlreadyRead(false);
        setN((v) => clamp(v + 1));
      }
    );
  }

  return (
    <section aria-labelledby="new-volume" className="flex flex-col gap-3 rounded-3xl p-4 sm:p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h2 id="new-volume" className="text-base font-bold">J&apos;ai un nouveau tome !</h2>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2" role="group" aria-label="Numéro du tome">
          <button type="button" onClick={() => setN((v) => clamp(v - 1))} aria-label="Tome précédent" className="h-12 w-12 rounded-xl text-2xl font-bold" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>−</button>
          <label className="flex items-center gap-2">
            <span className="text-sm">Tome</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={maxVolume}
              value={n}
              onChange={(e) => setN(clamp(Number(e.target.value) || 1))}
              className="h-12 w-20 rounded-xl text-center text-2xl font-black tabular-nums outline-none focus:ring-2"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            />
          </label>
          <button type="button" onClick={() => setN((v) => clamp(v + 1))} aria-label="Tome suivant" className="h-12 w-12 rounded-xl text-2xl font-bold" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>+</button>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={alreadyRead} onChange={(e) => setAlreadyRead(e.target.checked)} className="h-5 w-5" />
          Je l&apos;ai déjà lu
        </label>
      </div>
      {alreadyHere ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>Le tome {n} est déjà chez toi : touche-le dans la grille pour le modifier.</p>
      ) : (
        <button
          type="button"
          onClick={add}
          disabled={pending}
          className="min-h-12 rounded-2xl px-4 text-base font-bold text-white disabled:opacity-60 sm:self-start"
          style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))" }}
        >
          {pending ? "J'enregistre…" : `Ajouter le tome ${n}`}
        </button>
      )}
    </section>
  );
}

// Rare actions, out of the way : remove (reversible) or delete (not).
function SeriesOptions({
  title,
  mangaId,
  pending,
  run,
  form,
}: {
  title: string;
  mangaId: string;
  pending: boolean;
  run: Runner;
  form: (fields: Record<string, string>) => FormData;
}) {
  const router = useRouter();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [typed, setTyped] = useState("");

  return (
    <details className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold" style={{ color: "var(--muted)" }}>
        Plus d&apos;options
      </summary>
      <div className="mt-3 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Retirer de ma bibliothèque</p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            La série disparaît de ta bibliothèque. Tes tomes et tes lectures sont gardés : tu pourras la remettre.
          </p>
          {confirmArchive ? (
            <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
              <button type="button" onClick={() => setConfirmArchive(false)} className="min-h-11 rounded-xl text-sm font-semibold" style={{ border: "1px solid var(--border)" }}>
                Non
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => archiveSeries(form({ manga_id: mangaId })), () => router.push("/bibliotheque"))}
                className="min-h-11 rounded-xl text-sm font-bold disabled:opacity-60"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
              >
                Oui, la retirer
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmArchive(true)} className="flex min-h-11 items-center gap-2 self-start rounded-xl px-3 text-sm font-semibold" style={{ border: "1px solid var(--border)" }}>
              <AppIcon name="archive" size={16} /> Retirer de ma bibliothèque
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold" style={{ color: "#ff9a8a" }}>Supprimer définitivement</p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Efface la série, ses tomes, tes lectures et tes envies pour cette série. On ne peut pas revenir en arrière.
          </p>
          {deleting ? (
            <div className="flex flex-col gap-2 sm:max-w-sm">
              <label className="text-sm">
                Écris <strong>{title}</strong> pour confirmer
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl px-3 text-base outline-none focus:ring-2"
                  style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  autoComplete="off"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setDeleting(false); setTyped(""); }} className="min-h-11 rounded-xl text-sm font-semibold" style={{ border: "1px solid var(--border)" }}>
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={pending || typed.trim().toLowerCase() !== title.trim().toLowerCase()}
                  onClick={() => run(() => deleteSeriesPermanently(form({ manga_id: mangaId, confirm_title: typed })), () => router.push("/bibliotheque"))}
                  className="min-h-11 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                  style={{ background: "#b3261e" }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setDeleting(true)} className="flex min-h-11 items-center gap-2 self-start rounded-xl px-3 text-sm font-semibold" style={{ border: "1px solid rgba(255,110,90,0.4)", color: "#ff9a8a" }}>
              <AppIcon name="trash" size={16} /> Supprimer définitivement
            </button>
          )}
        </div>
      </div>
    </details>
  );
}

function NextCard({
  candidate,
  waiting,
  ownedCount,
  pending,
  onAct,
}: {
  candidate: ReturnType<typeof nextToRead>;
  waiting: number;
  ownedCount: number;
  pending: boolean;
  onAct: (intent: ReadingIntent, volume: number) => void;
}) {
  const box = "rounded-3xl p-4 sm:p-5";
  const boxStyle = {
    background: "radial-gradient(100% 120% at 0% 0%, rgba(255,106,61,0.14) 0%, transparent 60%), var(--surface)",
    border: "1px solid var(--border)",
  };

  if (!candidate) {
    return (
      <div className={box} style={boxStyle}>
        <p className="text-base font-bold">
          {ownedCount === 0 ? "Aucun tome chez toi pour l'instant." : waiting === 0 ? "Tu as lu tous tes tomes de cette série !" : "Rien à lire ensuite ici."}
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          {ownedCount === 0 ? "Ajoute les tomes que tu as juste en dessous." : "Quand un nouveau tome arrive, ajoute-le juste en dessous."}
        </p>
      </div>
    );
  }

  if (candidate.kind === "gap") {
    return (
      <div className={box} style={boxStyle}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--read)" }}>Tu peux lire…</p>
        <p className="mt-1 text-2xl font-black">Tome {candidate.available}</p>
        <p className="mt-2 rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(248,192,74,0.1)", border: "1px dashed rgba(248,192,74,0.45)" }}>
          Le <strong>tome {candidate.missing}</strong>{" "}n&apos;est pas sur ton étagère.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <BigButton onClick={() => onAct("start", candidate.available)} disabled={pending}>
            Lire le tome {candidate.available}
          </BigButton>
          <BigButton onClick={() => onAct("finish_earlier", candidate.missing)} disabled={pending} secondary>
            J&apos;ai lu le tome {candidate.missing} ailleurs
          </BigButton>
        </div>
      </div>
    );
  }

  const isReading = candidate.kind === "reading";
  return (
    <div className={box} style={boxStyle}>
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--read)" }}>
        {isReading ? "Tu lis…" : candidate.kind === "skipped" ? "Tu as laissé de côté…" : "À lire ensuite"}
      </p>
      <p className="mt-1 text-2xl font-black">Tome {candidate.volume}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <BigButton onClick={() => onAct(isReading ? "finish" : "start", candidate.volume)} disabled={pending}>
          {pending ? "J'enregistre…" : isReading ? "Je l'ai fini !" : "Je commence"}
        </BigButton>
        {!isReading && (
          <BigButton onClick={() => onAct("finish_earlier", candidate.volume)} disabled={pending} secondary>
            Déjà terminé ?
          </BigButton>
        )}
      </div>
    </div>
  );
}

function BigButton({ onClick, disabled, secondary, children }: { onClick: () => void; disabled?: boolean; secondary?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-12 flex-1 rounded-2xl px-4 py-3 text-base font-bold transition-transform active:scale-[0.98] disabled:opacity-60"
      style={
        secondary
          ? { background: "var(--surface-raised)", border: "1px solid var(--border)" }
          : { background: "linear-gradient(135deg, var(--read), var(--read-deep))", color: "white" }
      }
    >
      {children}
    </button>
  );
}

// Each state has its own icon and border, so it reads without colour.
// Reading (✓, ▶, open book) and ownership (solid vs dashed edge) are
// shown separately : a volume read elsewhere is ✓ with a dashed edge.
function VolumeTile({
  number,
  atHome,
  borrowed,
  status,
  next,
  wished,
  onOpen,
}: {
  number: number;
  atHome: boolean;
  borrowed: boolean;
  status: "reading" | "read" | null;
  next: boolean;
  wished: boolean;
  onOpen: () => void;
}) {
  const read = status === "read";
  const parts = [
    read ? "lu" : status === "reading" ? "en cours de lecture" : next ? "à lire ensuite" : atHome ? "pas encore lu" : "pas lu",
    atHome ? (borrowed ? "emprunté, chez toi" : "chez toi") : "pas chez toi",
  ];
  if (wished && !atHome) parts.push("dans tes envies");

  const style: React.CSSProperties = read
    ? atHome
      ? { background: "linear-gradient(160deg, #ff8a4c 0%, var(--read) 45%, var(--read-deep) 100%)", color: "white" }
      : { background: "rgba(255,106,61,0.12)", color: "var(--foreground)", border: "2px dashed var(--read)" }
    : status === "reading"
    ? { background: "var(--surface-raised)", color: "var(--foreground)", border: "2.5px solid var(--gold)" }
    : next
    ? { background: "var(--surface-raised)", color: "var(--foreground)", border: "2.5px solid var(--gold)", boxShadow: "0 0 0 3px rgba(248,192,74,0.2)" }
    : atHome
    ? { background: "var(--surface-raised)", color: "var(--foreground)", border: "1.5px solid var(--sleep)" }
    : { background: "transparent", color: "var(--muted)", border: `1.5px dashed ${wished ? "rgba(248,192,74,0.6)" : "var(--border)"}` };

  const icon = read ? "check" : status === "reading" ? "book-open" : next ? "play" : atHome ? "books" : wished ? "star" : null;
  const iconColor = read ? (atHome ? "white" : "var(--read)") : status === "reading" || next || wished ? "var(--gold)" : "var(--sleep)";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Tome ${number}, ${parts.join(", ")}`}
      className="relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-base font-extrabold tabular-nums transition-transform active:scale-95"
      style={{ ...style, aspectRatio: "1 / 1.1" }}
    >
      {number}
      {icon && (
        <span style={{ color: iconColor }}>
          <AppIcon name={icon} size={14} strokeWidth={icon === "check" ? 3 : 2} filled={icon === "play" || icon === "star"} />
        </span>
      )}
      {borrowed && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black" style={{ background: "var(--borrow)", color: "#06202b" }} aria-hidden="true">
          E
        </span>
      )}
    </button>
  );
}

function Legend() {
  const items = [
    { label: "Lu", icon: "check" as const, style: { background: "var(--read)", color: "white" } },
    { label: "Lu ailleurs", icon: "check" as const, style: { border: "1.5px dashed var(--read)", color: "var(--read)" } },
    { label: "En cours", icon: "book-open" as const, style: { border: "1.5px solid var(--gold)", color: "var(--gold)" } },
    { label: "À lire ensuite", icon: "play" as const, style: { border: "1.5px solid var(--gold)", color: "var(--gold)" } },
    { label: "Chez toi, pas lu", icon: "books" as const, style: { border: "1.5px solid var(--sleep)", color: "var(--sleep)" } },
    { label: "Pas chez toi", icon: null, style: { border: "1.5px dashed var(--border)" } },
  ];
  return (
    <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3" style={{ color: "var(--muted)" }}>
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md" style={it.style}>
            {it.icon && <AppIcon name={it.icon} size={11} strokeWidth={3} filled={it.icon === "play"} />}
          </span>
          {it.label}
        </li>
      ))}
      <li className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black" style={{ background: "var(--borrow)", color: "#06202b" }}>E</span>
        Emprunté
      </li>
    </ul>
  );
}
