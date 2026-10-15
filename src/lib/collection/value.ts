// Collection value helpers — pure functions, shared by server pages and tests.
// Used by the parent space only : the reader space shows no totals.
// Rules (price ≠ value):
//   value        = known prices of volumes kept at home (anything but borrowed)
//   paid         = known prices of bought volumes
//   costPerRead  = paid / volumes read
//   sleeping     = bought volumes not read yet
//   missing price: the volume counts in volume totals, never in amounts.
// Borrowed volumes are not value: they go back.
// Reading lives in user_readings, so "read" is passed in as a set of keys.

import type { AcquisitionType } from "@/lib/types/database";

export type OwnedVolume = {
  manga_id: string;
  volume_number: number;
  price_eur: number | null;
  acquisition_type: AcquisitionType | null; // null = not specified
  acquired_at: string | null; // YYYY-MM-DD, null = unknown
};

// "<manga_id>:<volume_number>"
export type VolumeKey = string;
export const volumeKey = (mangaId: string, volumeNumber: number): VolumeKey =>
  `${mangaId}:${volumeNumber}`;

export type ReadIndex = {
  has(key: VolumeKey): boolean;
  // Month (YYYY-MM) the reading was finished, null when unknown.
  finishedMonth(key: VolumeKey): string | null;
};

export type CollectionSummary = {
  volumesTotal: number;
  valueEur: number;
  paidEur: number;
  giftEur: number;
  sleepingEur: number;
  sleepingCount: number;
  costPerReadEur: number | null;
  missingPriceCount: number;
  borrowedCount: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const isKept = (v: OwnedVolume) => v.acquisition_type !== "borrowed";
const keyOf = (v: OwnedVolume) => volumeKey(v.manga_id, v.volume_number);

export function summarizeCollection(
  volumes: OwnedVolume[],
  reads: ReadIndex,
  volumesRead: number
): CollectionSummary {
  let valueEur = 0;
  let paidEur = 0;
  let giftEur = 0;
  let sleepingEur = 0;
  let sleepingCount = 0;
  let missingPriceCount = 0;
  let borrowedCount = 0;

  for (const v of volumes) {
    if (!isKept(v)) {
      borrowedCount++;
      continue;
    }
    const read = reads.has(keyOf(v));
    if (v.acquisition_type === "bought" && !read) sleepingCount++;
    if (v.price_eur == null) {
      missingPriceCount++;
      continue;
    }
    const price = Number(v.price_eur);
    valueEur += price;
    if (v.acquisition_type === "bought") {
      paidEur += price;
      if (!read) sleepingEur += price;
    }
    if (v.acquisition_type === "gift") giftEur += price;
  }

  return {
    volumesTotal: volumes.length,
    valueEur: round2(valueEur),
    paidEur: round2(paidEur),
    giftEur: round2(giftEur),
    sleepingEur: round2(sleepingEur),
    sleepingCount,
    costPerReadEur: volumesRead > 0 ? round2(paidEur / volumesRead) : null,
    missingPriceCount,
    borrowedCount,
  };
}

// ─────────────────────────────────────────
// Monthly timeline : cumulative value at the end of each month,
// split into the part already read and the part still waiting.
// Volumes with an unknown acquisition date are left out (undatedCount).
// A reading with an unknown date counts as read from the month the
// volume arrived : the chart never invents a later reading date.
// ─────────────────────────────────────────

export type TimelineSpine = {
  manga_id: string;
  volume_number: number;
  price_eur: number;
  read: boolean;
};

export type TimelineMonth = {
  key: string; // YYYY-MM
  readEur: number;
  unreadEur: number;
  totalEur: number;
  addedCount: number;
  addedEur: number;
  spines: TimelineSpine[]; // read first, then unread
};

export type Timeline = { months: TimelineMonth[]; undatedCount: number };

const monthKey = (date: string) => date.slice(0, 7);

function addMonths(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function buildMonthlyTimeline(
  volumes: OwnedVolume[],
  reads: ReadIndex,
  today: string, // YYYY-MM-DD
  maxMonths = 12
): Timeline {
  const priced = volumes.filter((v) => isKept(v) && v.price_eur != null);
  const dated = priced.filter((v) => v.acquired_at != null);
  const undatedCount = priced.length - dated.length;
  if (dated.length === 0) return { months: [], undatedCount };

  const lastKey = monthKey(today);
  const firstAcquired = dated.reduce(
    (min, v) => (monthKey(v.acquired_at!) < min ? monthKey(v.acquired_at!) : min),
    lastKey
  );
  let startKey = addMonths(lastKey, -(maxMonths - 1));
  if (firstAcquired > startKey) startKey = firstAcquired;

  const months: TimelineMonth[] = [];
  for (let key = startKey; key <= lastKey; key = addMonths(key, 1)) {
    const read: TimelineSpine[] = [];
    const unread: TimelineSpine[] = [];
    let addedCount = 0;
    let addedEur = 0;

    for (const v of dated) {
      const acquiredKey = monthKey(v.acquired_at!);
      if (acquiredKey > key) continue;
      const price = Number(v.price_eur);
      if (acquiredKey === key) {
        addedCount++;
        addedEur += price;
      }
      const k = keyOf(v);
      const readBy = reads.has(k) && (reads.finishedMonth(k) ?? acquiredKey) <= key;
      const spine = {
        manga_id: v.manga_id,
        volume_number: v.volume_number,
        price_eur: price,
        read: readBy,
      };
      (readBy ? read : unread).push(spine);
    }

    const readEur = round2(read.reduce((s, x) => s + x.price_eur, 0));
    const unreadEur = round2(unread.reduce((s, x) => s + x.price_eur, 0));
    const bySeries = (a: TimelineSpine, b: TimelineSpine) =>
      a.manga_id.localeCompare(b.manga_id) || a.volume_number - b.volume_number;

    months.push({
      key,
      readEur,
      unreadEur,
      totalEur: round2(readEur + unreadEur),
      addedCount,
      addedEur: round2(addedEur),
      spines: [...read.sort(bySeries), ...unread.sort(bySeries)],
    });
  }
  return { months, undatedCount };
}

// ─────────────────────────────────────────
// Series
// ─────────────────────────────────────────

// Next volume to buy : after the highest one at home. Parent space only;
// the reader's "next to read" lives in reading.ts.
export function nextVolumeToBuy(volumes: OwnedVolume[]): number {
  const numbers = volumes.map((v) => v.volume_number);
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

// Most recent price typed for these volumes : the sensible default for the next one.
export function lastKnownPrice(volumes: OwnedVolume[]): number | null {
  const priced = volumes
    .filter((v) => v.price_eur != null)
    .sort(
      (a, b) =>
        (b.acquired_at ?? "").localeCompare(a.acquired_at ?? "") ||
        b.volume_number - a.volume_number
    );
  return priced.length ? Number(priced[0].price_eur) : null;
}

// ─────────────────────────────────────────
// Wishlist
// ─────────────────────────────────────────

export type WishlistItemLike = { target_price: number | null };

export function summarizeWishlist(items: WishlistItemLike[]) {
  let totalEur = 0;
  let missingPriceCount = 0;
  for (const item of items) {
    if (item.target_price == null) missingPriceCount++;
    else totalEur += Number(item.target_price);
  }
  return { totalEur: round2(totalEur), missingPriceCount, count: items.length };
}

// ─────────────────────────────────────────
// Formatting (fr-FR)
// ─────────────────────────────────────────

const eurFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

const eurRoundFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatEur(n: number, opts?: { round?: boolean }): string {
  return (opts?.round ? eurRoundFormatter : eurFormatter).format(n);
}

const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  timeZone: "UTC",
});
const monthLongFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// 3-4 letter labels that never need truncating on a 12-column phone chart.
const SHORT_MONTHS = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "aoû", "sep", "oct", "nov", "déc"];

export function formatMonthShort(key: string): string {
  return SHORT_MONTHS[Number(key.slice(5, 7)) - 1];
}

export function formatMonth(key: string, long = false): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return (long ? monthLongFormatter : monthFormatter).format(d).replace(".", "");
}

// Today in Paris, as YYYY-MM-DD (en-CA formats dates that way).
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}
