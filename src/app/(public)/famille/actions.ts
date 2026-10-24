"use server";

import { redirect } from "next/navigation";
import { frenchDate } from "@/lib/account/gate";
import { serviceClient } from "@/lib/server/consent";
import { familyListReadyEmail, sendEmail } from "@/lib/server/email";
import { logServerEvent } from "@/lib/server/analytics";
import { hashLinkToken } from "@/lib/server/link-token";
import { createFamilyShare, loadParentLink, parentPageUrl, stopFamilyShare } from "@/lib/server/wishlist-share";
import { DisplayNameSchema } from "@/lib/wishlist/share";
import type { ShareState } from "@/app/(app)/envies/actions";

// The parent's page, from the emailed link : the link is the only
// credential (256-bit token, hash stored). Reading the page changes
// nothing ; creating or stopping is a POST.

export async function parentShareList(_prev: ShareState, formData: FormData): Promise<ShareState> {
  const token = formData.get("token");
  const raw = formData.get("display_name");
  const value = typeof raw === "string" ? raw : undefined;
  if (typeof token !== "string") redirect("/famille/invalide");
  const name = DisplayNameSchema.safeParse(raw ?? "");
  if (!name.success) return { error: name.error.issues[0].message, value };

  const parent = await loadParentLink(token);
  if (!parent) redirect(`/famille/${encodeURIComponent(token)}`); // the page says why
  const share = await createFamilyShare(parent.userId, name.data, true);
  if (!share) return { error: "Le lien n'a pas pu être créé. Réessaie dans quelques minutes.", value };

  const service = serviceClient();
  // This page must outlive the link it manages : the parent can always stop it.
  await service
    .from("wishlist_parent_links")
    .update({ expires_at: share.expiresAt.toISOString() })
    .eq("user_id", parent.userId)
    .lt("expires_at", share.expiresAt.toISOString());

  await logServerEvent("family_list_created", { by: "parent" });
  const until = frenchDate(share.expiresAt);
  // A copy for the parent, within the same email budget as the others ;
  // the link is on screen anyway.
  const { data: claim } = await service.rpc("claim_consent_email", {
    p_user: parent.userId,
    p_recipient_hash: hashLinkToken(parent.parentEmail),
  });
  const sent =
    claim === "ok" &&
    (await sendEmail({
      to: parent.parentEmail,
      ...familyListReadyEmail({ listLink: share.url, manageLink: parentPageUrl(token), displayName: name.data, until }),
    }));
  return { link: share.url, until, value: name.data, sent };
}

export async function parentStopShare(formData: FormData) {
  const token = formData.get("token");
  if (typeof token !== "string") redirect("/famille/invalide");
  const parent = await loadParentLink(token);
  if (!parent) redirect(`/famille/${encodeURIComponent(token)}`);
  const ok = await stopFamilyShare(parent.userId);
  if (ok) await logServerEvent("family_list_stopped", { by: "parent" });
  redirect(`/famille/${encodeURIComponent(token)}?${ok ? "arrete=1" : "erreur=1"}`);
}
