import { createHash, randomBytes } from "node:crypto";

// Links sent by email or shared with the family carry a 256-bit token ;
// the database only keeps its sha256 (consent, family list).
export function newLinkToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashLinkToken(token) };
}

export function hashLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const isLinkToken = (t: string) => /^[A-Za-z0-9_-]{43}$/.test(t);
