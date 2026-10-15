"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppIcon } from "@/components/app/app-icon";
import { VolumeSheet, type VolumeSavedEvent } from "@/components/collection/volume-sheet";
import { ReadingToast } from "@/components/collection/reading-toast";
import { useReadingAction, type ReadingIntent } from "@/components/collection/use-reading-action";
import { addVolumeRange } from "@/app/(app)/bibliotheque/actions";
import { addWishlistItem } from "@/app/(app)/envies/actions";
import { formatPriceInput } from "@/components/collection/volume-fields";
import { lastKnownPrice, nextVolumeToBuy, type OwnedVolume } from "@/lib/collection/value";
import { buildShelves, nextToRead, type Reading } from "@/lib/collection/reading";

type Manga = {
  id: string;
  title: string;
  author: string | null;
  publisher_fr: string | null;
  total_volumes: number | null;
  status: "ongoing" | "completed" | "paused";
  genre_primary: string | null;
  cover_url: string | null;
};

type Props = {
  manga: Manga;
  volumes: OwnedVolume[];
  readings: Reading[];
  wishedVolumes: number[];
};

const MANGA_STATUS_LABELS = {
  ongoing: "En cours de parution",
  completed: "Terminée",
  paused: "En pause",
} as const;

export function SerieDetail({ manga, volumes, readings, wishedVolumes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openVolume, setOpenVolume] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rangeFrom, setRangeFrom] = useState("1");
  const [rangeTo, setRangeTo] = useState("");
  const [confirmRange, setConfirmRange] = useState(false);
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
  const highest = Math.max(0, ...shelf.owned, ...shelf.read, ...shelf.reading);
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

  function runForm(action: (fd: FormData) => Promise<{ success: boolean; error?: string }>, fd: FormData, after: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action(fd);
      if (!result.success) {
        setError(result.error ?? "Pas enregistré. Réessaie.");
        return;
      }
      after();
      router.refresh();
    });
  }

  const from = parseInt(rangeFrom, 10);
  const to = parseInt(rangeTo, 10);
  const rangeValid = !isNaN(from) && !isNaN(to) && from >= 1 && from <= to && to - from < 500;

  function handleBulkAdd() {
    const fd = new FormData();
    fd.set("manga_id", manga.id);
    fd.set("from", String(from));
    fd.set("to", String(to));
    runForm(addVolumeRange, fd, () => {
      const count = to - from + 1;
      setNotice(`${count} tome${count > 1 ? "s" : ""} sur ton étagère !`);
      setConfirmRange(false);
      setRangeTo("");
    });
  }

  function handleWishNext() {
    const fd = new FormData();
    fd.set("manga_id", manga.id);
    fd.set("volume_number", String(toBuy));
    if (priceHint != null) fd.set("target_price", formatPriceInput(priceHint));
    runForm(addWishlistItem, fd, () => setNotice(`Tome ${toBuy} dans tes envies`));
  }

  const openVolumeData = openVolume != null ? owned.get(openVolume) ?? null : null;
  const openReading = openVolume != null ? readingByNumber.get(openVolume) ?? null : null;
  const waiting = shelf.owned.filter((v) => !shelf.read.includes(v)).length;

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--background)" }}>
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 sm:px-6"
        style={{ background: "color-mix(in srgb, var(--background) 88%, transparent)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/bibliotheque" className="flex min-h-11 items-center gap-1.5 text-sm" style={{ color: "var(--muted)" }}>
          ← Mes séries
        </Link>
        <Link href="/collection" className="ml-auto flex min-h-11 items-center text-sm" style={{ color: "var(--muted)" }}>
          Accueil
        </Link>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Hero */}
        <div className="mb-5 flex gap-4">
          <div
            className="flex shrink-0 items-end overflow-hidden rounded-xl p-2"
            style={{
              width: 92,
              aspectRatio: "2/3",
              background: manga.cover_url
                ? `url(${manga.cover_url}) center/cover no-repeat, #1a1010`
                : "linear-gradient(160deg,#2a1d1a 0%,#0e0b0b 100%)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
            }}
            aria-hidden="true"
          >
            {!manga.cover_url && <span className="text-[11px] font-bold leading-tight" style={{ color: "var(--read)" }}>{manga.title}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="mb-1 text-2xl font-bold leading-tight sm:text-3xl">{manga.title}</h1>
            <p className="text-base font-semibold">
              {shelf.read.length} lu{shelf.read.length > 1 ? "s" : ""} · {shelf.owned.length} chez toi
            </p>
            {manga.author && <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{manga.author}</p>}
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              {MANGA_STATUS_LABELS[manga.status]}
              {totalVolumes > 0 && ` · ${totalVolumes} tomes parus`}
            </p>
          </div>
        </div>

        {/* What to read next */}
        <NextCard
          candidate={candidate}
          waiting={waiting}
          pending={reading.isPending}
          onAct={act}
        />

        {/* Volume grid */}
        <section aria-labelledby="grid-title" className="mt-6">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="grid-title" className="text-sm font-bold">Tous les tomes</h2>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Touche un tome pour le changer.</p>
          </div>
          <div className="grid grid-cols-5 gap-2 min-[420px]:grid-cols-6 sm:grid-cols-8">
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

        {/* More */}
        <section className="mt-8 flex flex-col gap-4 rounded-3xl p-4 sm:p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
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
                  onClick={handleWishNext}
                  disabled={isPending}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold disabled:opacity-50"
                  style={{ background: "rgba(248,192,74,0.14)", color: "var(--gold)" }}
                >
                  <AppIcon name="star" size={16} /> Je le veux
                </button>
              )}
            </div>
          )}

          <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <p className="mb-2 text-sm font-semibold">Ajouter plusieurs tomes à ton étagère</p>
            {confirmRange && rangeValid ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm">
                  Ajouter les tomes {from} à {to} ?{" "}
                  <span style={{ color: "var(--muted)" }}>Ils ne seront pas notés comme lus.</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setConfirmRange(false)} disabled={isPending} className="min-h-11 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                    Non
                  </button>
                  <button type="button" onClick={handleBulkAdd} disabled={isPending} className="min-h-11 rounded-xl text-sm font-bold text-white" style={{ background: "var(--accent)" }}>
                    {isPending ? "J'enregistre…" : "Oui, ajouter"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>Du tome</span>
                <NumberInput value={rangeFrom} onChange={setRangeFrom} label="Premier tome" />
                <span>au</span>
                <NumberInput value={rangeTo} onChange={setRangeTo} placeholder={totalVolumes ? String(totalVolumes) : "N"} label="Dernier tome" />
                <button
                  type="button"
                  onClick={() => setConfirmRange(true)}
                  disabled={!rangeValid}
                  className="min-h-11 rounded-xl px-4 text-sm font-bold disabled:opacity-40"
                  style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
                >
                  Ajouter
                </button>
              </div>
            )}
          </div>
          {error && <p className="text-sm" role="alert" style={{ color: "var(--accent-hover)" }}>{error}</p>}
          {notice && !error && <p className="text-sm font-semibold" role="status" style={{ color: "var(--read)" }}>{notice}</p>}
        </section>
      </div>

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

function NextCard({
  candidate,
  waiting,
  pending,
  onAct,
}: {
  candidate: ReturnType<typeof nextToRead>;
  waiting: number;
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
        <p className="text-base font-bold">{waiting === 0 ? "Tu as lu tous tes tomes de cette série !" : "Rien à lire ensuite ici."}</p>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Quand un nouveau tome arrive, touche-le dans la grille.</p>
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
        {isReading ? "Tu lis…" : "À lire ensuite"}
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

function NumberInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
}) {
  return (
    <input
      type="number"
      min={1}
      inputMode="numeric"
      value={value}
      placeholder={placeholder}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-11 w-16 rounded-xl px-2 text-center text-sm tabular-nums outline-none focus:ring-2"
      style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
    />
  );
}
