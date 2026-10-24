"use server";

import { redirect } from "next/navigation";
import { serviceClient } from "@/lib/server/consent";
import { hashLinkToken, isLinkToken } from "@/lib/server/link-token";
import { logServerEvent } from "@/lib/server/analytics";

// The parent's answer, from the emailed link. The link is the only
// credential : a 256-bit token whose hash is stored. A GET never changes
// anything (mail scanners open links) : every answer is a POST.
async function consentFor(formData: FormData) {
  const token = formData.get("token");
  if (typeof token !== "string" || !isLinkToken(token)) return null;
  const service = serviceClient();
  const { data } = await service
    .from("parental_consents")
    .select("user_id, expires_at, confirmed_at")
    .eq("token_hash", hashLinkToken(token))
    .maybeSingle();
  if (!data) return null;
  return { token, service, ...data };
}

export async function giveConsent(formData: FormData) {
  const token = formData.get("token");
  if (typeof token !== "string" || !isLinkToken(token)) redirect("/accord/invalide");
  // Both writes in one transaction (give_parental_consent) ; repeating is safe.
  // It also locks Découvrir to the youth selection and the profile to private.
  const { data: userId, error } = await serviceClient().rpc("give_parental_consent", { p_token_hash: hashLinkToken(token) });
  if (error) redirect(`/accord/${token}?erreur=accord`);
  if (!userId) redirect(`/accord/${token}`); // unknown or expired : the page says so
  await logServerEvent("parent_consent_given", {});
  redirect(`/accord/${token}?ok=1`);
}

// "Je refuse" before, or "je retire mon accord" after : the child's account
// and all its data are deleted (profiles and everything below cascade).
export async function deleteChildAccount(formData: FormData) {
  const consent = await consentFor(formData);
  if (!consent) redirect("/accord/invalide");
  const { error } = await consent.service.auth.admin.deleteUser(consent.user_id);
  if (error) redirect(`/accord/${consent.token}?erreur=suppression`);
  await logServerEvent("parent_consent_refused", { when: consent.confirmed_at ? "given" : "pending" });
  redirect("/accord/supprime");
}
