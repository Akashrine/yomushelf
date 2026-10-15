// "Mon univers" helpers — pure functions, shared by the page and tests.
//
// Three separate stories, never mixed :
//   taste      : see lib/discovery (territoryTastes)
//   readings   : how much and when they read (dated readings only in charts)
//   spending   : what was actually paid, as typed in ; gifts apart
//   wishlist   : an estimate of what the wishes would cost, never "spent"

import type { OwnedVolume } from "@/lib/collection/value";
import type { Reading, SeriesShelf } from "@/lib/collection/reading";

const round2 = (n: number) => Math.round(n * 100) / 100;

export function lastMonths(today: string, count = 12): string[] {
  const [y, m] = today.slice(0, 7).split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

// ─────────────────────────────────────────
// Volumes waiting at home : what can be read right now
// ─────────────────────────────────────────

export type Waiting = { manga_id: string; title: string; slug: string; unread: number; owned: number };

// Series with unread volumes at home, most waiting first. Borrowed
// volumes count : they are at home now.
export function waitingAtHome(shelves: SeriesShelf[], limit = 5): { total: number; series: Waiting[] } {
  const all = shelves
    .map((s) => {
      const read = new Set(s.read);
      return { manga_id: s.manga_id, title: s.title, slug: s.slug, unread: s.owned.filter((v) => !read.has(v)).length, owned: s.owned.length };
    })
    .filter((w) => w.unread > 0)
    .sort((a, b) => b.unread - a.unread || a.title.localeCompare(b.title, "fr"));
  return { total: all.reduce((n, w) => n + w.unread, 0), series: all.slice(0, limit) };
}

// ─────────────────────────────────────────
// Readings overview
// ─────────────────────────────────────────

export type MonthCount = { key: string; count: number };

export function readingsOverview(
  readings: Reading[],
  totals: Map<string, number | null>, // manga_id → volumes published (null = unknown)
  today: string
) {
  const read = readings.filter((r) => r.status === "read");
  const months = lastMonths(today);
  const year = today.slice(0, 4);
  const byMonth = new Map(months.map((k) => [k, 0]));
  let undated = 0;
  let thisYear = 0;
  for (const r of read) {
    if (!r.finished_on) {
      undated++;
      continue;
    }
    const k = r.finished_on.slice(0, 7);
    if (byMonth.has(k)) byMonth.set(k, (byMonth.get(k) ?? 0) + 1);
    if (r.finished_on.startsWith(year)) thisYear++;
  }

  // A series is finished when every volume from 1 to its total is read :
  // volumes numbered past the total do not count.
  const readPerSeries = new Map<string, Set<number>>();
  for (const r of read) {
    const set = readPerSeries.get(r.manga_id) ?? new Set<number>();
    set.add(r.volume_number);
    readPerSeries.set(r.manga_id, set);
  }
  let seriesFinished = 0;
  for (const [id, numbers] of readPerSeries) {
    const total = totals.get(id);
    if (total == null || total <= 0) continue;
    let within = 0;
    for (const n of numbers) if (n >= 1 && n <= total) within++;
    if (within >= total) seriesFinished++;
  }
  const inProgress = new Set(readings.filter((r) => r.status === "reading").map((r) => r.manga_id)).size;

  return {
    total: read.length,
    thisYear,
    undated,
    months: months.map((key) => ({ key, count: byMonth.get(key) ?? 0 })),
    seriesFinished,
    seriesStarted: readPerSeries.size,
    inProgress,
  };
}

// ─────────────────────────────────────────
// Spending : what was typed in as paid
// ─────────────────────────────────────────

export type MonthAmount = { key: string; amount: number };

export function spendingOverview(volumes: OwnedVolume[], today: string) {
  const months = lastMonths(today);
  const byMonth = new Map(months.map((k) => [k, 0]));
  let paid = 0;
  let paidCount = 0;
  let undatedPaid = 0;
  let gifts = 0;
  let giftsCount = 0;
  let unpricedBought = 0;
  let unknownOrigin = 0;
  let borrowed = 0;

  for (const v of volumes) {
    if (v.acquisition_type === "borrowed") {
      borrowed++;
      continue;
    }
    if (v.acquisition_type == null || v.acquisition_type === "other") {
      unknownOrigin++;
      continue;
    }
    if (v.acquisition_type === "gift") {
      giftsCount++;
      if (v.price_eur != null) gifts += Number(v.price_eur);
      continue;
    }
    // bought
    if (v.price_eur == null) {
      unpricedBought++;
      continue;
    }
    const price = Number(v.price_eur);
    paid += price;
    paidCount++;
    if (!v.acquired_at) {
      undatedPaid += price;
      continue;
    }
    const k = v.acquired_at.slice(0, 7);
    if (byMonth.has(k)) byMonth.set(k, (byMonth.get(k) ?? 0) + price);
  }

  return {
    paid: round2(paid),
    paidCount,
    averagePaid: paidCount ? round2(paid / paidCount) : null,
    undatedPaid: round2(undatedPaid),
    months: months.map((key) => ({ key, amount: round2(byMonth.get(key) ?? 0) })),
    gifts: round2(gifts),
    giftsCount,
    // Coverage : bought volumes with a typed price, out of all bought volumes.
    boughtCount: paidCount + unpricedBought,
    unpricedBought,
    unknownOrigin,
    borrowed,
  };
}

// ─────────────────────────────────────────
// Wishlist estimate : never added to spending
// ─────────────────────────────────────────

// Price of a wish, in this order (never invented) :
//   indicative : the price the reader typed for this wish
//   series     : estimated from the last price paid for this series
//   average    : estimated from the reader's average paid price
//   unknown    : no basis at all
export type WishPrice =
  | { kind: "indicative"; amount: number }
  | { kind: "series" | "average"; amount: number }
  | { kind: "unknown" };

export function wishPrice(targetPrice: number | null, seriesLastPaid: number | null, readerAverage: number | null): WishPrice {
  if (targetPrice != null) return { kind: "indicative", amount: Number(targetPrice) };
  if (seriesLastPaid != null) return { kind: "series", amount: Number(seriesLastPaid) };
  if (readerAverage != null) return { kind: "average", amount: Number(readerAverage) };
  return { kind: "unknown" };
}

export function wishlistEstimate(prices: WishPrice[]) {
  let known = 0;
  let knownCount = 0;
  let estimated = 0;
  let estimatedCount = 0;
  let unknownCount = 0;
  for (const p of prices) {
    if (p.kind === "indicative") {
      known += p.amount;
      knownCount++;
    } else if (p.kind === "unknown") {
      unknownCount++;
    } else {
      estimated += p.amount;
      estimatedCount++;
    }
  }
  return {
    count: prices.length,
    total: round2(known + estimated),
    known: round2(known),
    knownCount,
    estimated: round2(estimated),
    estimatedCount,
    unknownCount,
  };
}
