import { serviceClient } from "@/lib/server/consent";
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
