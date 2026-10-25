import { z } from "zod";

const DAY = 86_400_000;

// A stopped or expired link, its reservations and an old parent link are
// erased this many days after they ended (privacy page, /api/cron/list-purge).
export const LIST_KEEP_DAYS = 30;
// The log of consent and list emails only serves the sending limits.
export const EMAIL_LOG_KEEP_DAYS = 2;

// A Christmas list link ends on the next 31 January, end of day in Paris
// (UTC+1 in winter). In late January, when that is under a week away,
// it lasts 30 days instead.
export function defaultShareExpiry(now: Date): Date {
  const parisYear = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Europe/Paris" }).format(now));
  let end = new Date(Date.UTC(parisYear, 0, 31, 22, 59, 59));
  if (end.getTime() <= now.getTime()) end = new Date(Date.UTC(parisYear + 1, 0, 31, 22, 59, 59));
  if (end.getTime() - now.getTime() < 7 * DAY) return new Date(now.getTime() + 30 * DAY);
  return end;
}

// The first name the family sees on the list.
export const DisplayNameSchema = z
  .string()
  .trim()
  .min(1, "Écris un prénom.")
  .max(30, "30 caractères maximum.");

export const isActiveShare = (share: { expires_at: string; revoked_at: string | null } | null, now = Date.now()) =>
  !!share && !share.revoked_at && new Date(share.expires_at).getTime() > now;
