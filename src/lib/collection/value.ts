// Collection value helpers — pure functions, shared by server pages and tests.
// Rules (price ≠ value):
//   value        = known prices of volumes kept at home (bought, gift, other)
//   paid         = known prices of bought volumes
//   costPerRead  = paid / volumes read
//   sleeping     = known prices of bought volumes not read yet
//   missing price: the volume counts in volume totals, never in amounts.
// Borrowed volumes count as read books but not as value: they go back.

import type { AcquisitionType, VolumeReadStatus } from "@/lib/types/database";

export type OwnedVolume = {
  manga_id: string;
  volume_number: number;
  price_eur: number | null;
  acquisition_type: AcquisitionType;
  acquired_at: string; // YYYY-MM-DD
  read_status: VolumeReadStatus;
  read_at: string | null; // YYYY-MM-DD
};

export type CollectionSummary = {
  volumesTotal: number;
  volumesRead: number;
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
const isRead = (v: OwnedVolume) => v.read_status === "read";

export function summarizeCollection(volumes: OwnedVolume[]): CollectionSummary {
  let valueEur = 0;
  let paidEur = 0;
  let giftEur = 0;
  let sleepingEur = 0;
  let sleepingCount = 0;
  let missingPriceCount = 0;
  let borrowedCount = 0;
  let volumesRead = 0;

  for (const v of volumes) {
    if (isRead(v)) volumesRead++;
    if (!isKept(v)) {
      borrowedCount++;
      continue;
    }
    if (v.acquisition_type === "bought" && !isRead(v)) sleepingCount++;
    if (v.price_eur == null) {
      missingPriceCount++;
      continue;
    }
    const price = Number(v.price_eur);
    valueEur += price;
    if (v.acquisition_type === "bought") {
      paidEur += price;
      if (!isRead(v)) sleepingEur += price;
    }
    if (v.acquisition_type === "gift") giftEur += price;
  }

  return {
    volumesTotal: volumes.length,
    volumesRead,
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

const monthKey = (date: string) => date.slice(0, 7);

function addMonths(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function buildMonthlyTimeline(
  volumes: OwnedVolume[],
  today: string, // YYYY-MM-DD
  maxMonths = 12
): TimelineMonth[] {
  const priced = volumes.filter((v) => isKept(v) && v.price_eur != null);
  if (priced.length === 0) return [];

  const lastKey = monthKey(today);
  const firstAcquired = priced.reduce(
    (min, v) => (monthKey(v.acquired_at) < min ? monthKey(v.acquired_at) : min),
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

    for (const v of priced) {
      const acquiredKey = monthKey(v.acquired_at);
      if (acquiredKey > key) continue;
      const price = Number(v.price_eur);
      if (acquiredKey === key) {
        addedCount++;
        addedEur += price;
      }
      const readBy =
        isRead(v) && monthKey(v.read_at ?? v.acquired_at) <= key;
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
  return months;
}

// ─────────────────────────────────────────
// Series
// ─────────────────────────────────────────

export type SeriesSummary = CollectionSummary & {
  ownedCount: number;
  nextVolumeNumber: number;
  lastPriceEur: number | null;
};

export function summarizeSeries(volumes: OwnedVolume[]): SeriesSummary {
  const base = summarizeCollection(volumes);
  const numbers = volumes.map((v) => v.volume_number);
  return {
    ...base,
    ownedCount: volumes.filter(isKept).length,
    nextVolumeNumber: numbers.length ? Math.max(...numbers) + 1 : 1,
    lastPriceEur: lastKnownPrice(volumes),
  };
}

// Most recent price typed for these volumes : the sensible default for the next one.
export function lastKnownPrice(volumes: OwnedVolume[]): number | null {
  const priced = volumes
    .filter((v) => v.price_eur != null)
    .sort(
      (a, b) =>
        b.acquired_at.localeCompare(a.acquired_at) ||
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
