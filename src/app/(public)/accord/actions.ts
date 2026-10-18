"use server";

import { redirect } from "next/navigation";
import { hashConsentToken, isConsentToken, serviceClient } from "@/lib/server/consent";
import { logServerEvent } from "@/lib/server/analytics";

// The parent's answer, from the emailed link. The link is the only
// credential : a 256-bit token whose hash is stored. A GET never changes
// anything (mail scanners open links) : every answer is a POST.
async function consentFor(formData: FormData) {
  const token = formData.get("token");
  if (typeof token !== "string" || !isConsentToken(token)) return null;
  const service = serviceClient();
  const { data } = await service
    .from("parental_consents")
    .select("user_id, expires_at, confirmed_at")
    .eq("token_hash", hashConsentToken(token))
    .maybeSingle();
  if (!data) return null;
  return { token, service, ...data };
}

export async function giveConsent(formData: FormData) {
  const consent = await consentFor(formData);
  if (!consent) redirect("/accord/invalide");
  if (!consent.confirmed_at) {
    if (new Date(consent.expires_at).getTime() < Date.now()) redirect(`/accord/${consent.token}`);
    const now = new Date().toISOString();
    await consent.service.from("parental_consents").update({ confirmed_at: now }).eq("user_id", consent.user_id);
    // The trigger locks Découvrir to the youth selection and the profile to private.
    await consent.service.from("profiles").update({ parent_consent_at: now }).eq("id", consent.user_id);
    await logServerEvent("parent_consent_given", {});
  }
  redirect(`/accord/${consent.token}?ok=1`);
}

// "Je refuse" before, or "je retire mon accord" after : the child's account
// and all its data are deleted (profiles and everything below cascade).
export async function deleteChildAccount(formData: FormData) {
  const consent = await consentFor(formData);
  if (!consent) redirect("/accord/invalide");
  const { error } = await consent.service.auth.admin.deleteUser(consent.user_id);
  if (error) redirect(`/accord/${consent.token}?erreur=1`);
  await logServerEvent("parent_consent_refused", { when: consent.confirmed_at ? "given" : "pending" });
  redirect("/accord/supprime");
}
