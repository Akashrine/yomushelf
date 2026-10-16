// Volume and price helpers — pure functions, shared by server pages and tests.
// Money totals for "Mon univers" live in lib/univers/stats.ts.

import type { AcquisitionType } from "@/lib/types/database";

export type OwnedVolume = {
  manga_id: string;
  volume_number: number;
  price_eur: number | null;
  acquisition_type: AcquisitionType | null; // null = not specified
  acquired_at: string | null; // YYYY-MM-DD, null = unknown
};

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
