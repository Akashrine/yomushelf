import { cache } from "react";
import { cookies } from "next/headers";
import { serviceClient } from "@/lib/server/consent";
import { getSessionUser } from "@/lib/supabase/session";
import { hashLinkToken, isLinkToken, newLinkToken } from "@/lib/server/link-token";
import { defaultShareExpiry } from "@/lib/wishlist/share";

// The family link to a reader's wishlist (migration 20261022000200). The
// caller has already checked who asks : the reader's session (15 and
// over) or the parent's emailed link (under 15). The database checks
// again that this reader may be shared that way.

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "";
export const familyListUrl = (token: string) => `${appUrl()}/liste/${token}`;
export const parentPageUrl = (token: string) => `${appUrl()}/famille/${token}`;

// Creates the link, or replaces it (the old one stops working). The token
// is returned once, to be shown and emailed : only its hash is stored.
export async function createFamilyShare(userId: string, displayName: string, byParent: boolean) {
  const { token, hash } = newLinkToken();
  const expiresAt = defaultShareExpiry(new Date());
  const { error } = await serviceClient().rpc("upsert_wishlist_share", {
    p_user_id: userId,
    p_token_hash: hash,
    p_display_name: displayName,
    p_by_parent: byParent,
    p_expires_at: expiresAt.toISOString(),
  });
  if (error) return null;
  return { url: familyListUrl(token), expiresAt };
}

export async function stopFamilyShare(userId: string) {
  const { error } = await serviceClient()
    .from("wishlist_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("revoked_at", null);
  return !error;
}

// The parent's page : who the child is and where the link stands. Null
// when the link is unknown, expired, or the child may no longer be shared
// by a parent (15 and over now, or no consent).
export async function loadParentLink(token: string) {
  if (!isLinkToken(token)) return null;
  const service = serviceClient();
  const { data: link } = await service
    .from("wishlist_parent_links")
    .select("user_id, expires_at")
    .eq("token_hash", hashLinkToken(token))
    .maybeSingle();
  if (!link || new Date(link.expires_at).getTime() <= Date.now()) return null;
  const [{ data: profile }, { data: share }, { data: consent }] = await Promise.all([
    service.from("profiles").select("username, age_band, parent_consent_at").eq("id", link.user_id).maybeSingle(),
    service.from("wishlist_shares").select("display_name, expires_at, revoked_at").eq("user_id", link.user_id).maybeSingle(),
    service.from("parental_consents").select("parent_email, confirmed_at").eq("user_id", link.user_id).maybeSingle(),
  ]);
  if (!profile || profile.age_band !== "under_15" || !profile.parent_consent_at || !consent?.confirmed_at) return null;
  return { userId: link.user_id, username: profile.username, parentEmail: consent.parent_email, share: share ?? null };
}

// ── The family's page (/liste/<token>) ───────────────────────
// A browser that says "Je l'offre" gets a random secret (httpOnly cookie,
// only sent to /liste) ; the reservation keeps its hash, so this browser
// alone can see it as its own and take it back.
const OFFER_COOKIE = "yomushelf_offre";

export async function offerSecret({ create }: { create: boolean }): Promise<string | null> {
  const jar = await cookies();
  const current = jar.get(OFFER_COOKIE)?.value;
  if (current && isLinkToken(current)) return current;
  if (!create) return null;
  const { token } = newLinkToken();
  jar.set(OFFER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/liste",
    maxAge: 180 * 86_400,
  });
  return token;
}

// Once per request (page and its metadata). Null : unknown, stopped or expired.
// The reader who opens their own link (15 and over hold it) sees no
// reservation : the surprise holds on this page too.
export const loadSharedList = cache(async (token: string) => {
  if (!isLinkToken(token)) return null;
  const hash = hashLinkToken(token);
  const [secret, { user }] = await Promise.all([offerSecret({ create: false }), getSessionUser()]);
  const service = serviceClient();
  const [{ data, error }, own] = await Promise.all([
    service.rpc("get_shared_wishlist", { p_token_hash: hash, ...(secret ? { p_undo_hash: hashLinkToken(secret) } : {}) }),
    user ? service.from("wishlist_shares").select("user_id").eq("user_id", user.id).eq("token_hash", hash).maybeSingle() : null,
  ]);
  if (error) throw new Error("Impossible de charger cette liste.");
  if (!data) return null;
  const owner = !!own?.data;
  return { ...data, owner, items: owner ? data.items.map((i) => ({ ...i, reserved: false, mine: false })) : data.items };
});
