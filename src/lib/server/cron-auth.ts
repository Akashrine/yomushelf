import { timingSafeEqual } from "node:crypto";

// Privileged routes (cron, admin) : "Authorization: Bearer <CRON_SECRET>".
// Refused when the secret is missing or short, so an unset variable never
// turns into the accepted value "Bearer undefined".
export function isAuthorizedCron(header: string | null, secret = process.env.CRON_SECRET): boolean {
  if (!secret || secret.length < 16 || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
