"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CONSENT_DAYS, HEARD_FROM, frenchDate } from "@/lib/account/gate";
import { hashConsentToken, newConsentToken, serviceClient } from "@/lib/server/consent";
import { parentConsentEmail, sendEmail } from "@/lib/server/email";
import { logServerEvent } from "@/lib/server/analytics";

// The child's session is checked here ; the writes go through the service
// role, since clients may not change these columns (migration 20261022000100).
async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function chooseAgeBand(formData: FormData) {
  const band = z.enum(["under_15", "15_plus"]).safeParse(formData.get("band"));
  if (!band.success) redirect("/bienvenue");
  const user = await signedIn();
  const service = serviceClient();
  const { data: profile } = await service.from("profiles").select("parent_consent_at, age_band_set_at").eq("id", user.id).single();
  // A parent's yes is final here : only the parent's link can undo it.
  if (profile?.parent_consent_at) redirect("/bienvenue");

  // The first answer starts the 14 days : answering again never moves them.
  // A consent request already sent stays, so the parent can still refuse.
  await service
    .from("profiles")
    .update({ age_band: band.data, age_band_set_at: profile?.age_band_set_at ?? new Date().toISOString() })
    .eq("id", user.id);
  await logServerEvent("age_answered", { band: band.data }, { accountCreatedAt: user.created_at });
  redirect("/bienvenue");
}

const HeardFromSchema = z.enum(HEARD_FROM.map((h) => h.key) as [string, ...string[]]);

export async function chooseHeardFrom(formData: FormData) {
  const answer = HeardFromSchema.safeParse(formData.get("answer"));
  if (!answer.success) redirect("/bienvenue");
  const user = await signedIn();
  const key = answer.data as (typeof HEARD_FROM)[number]["key"];
  await serviceClient().from("profiles").update({ heard_from: key }).eq("id", user.id);
  await logServerEvent("heard_from_answered", { answer: key }, { accountCreatedAt: user.created_at });
  redirect("/bienvenue");
}

// Back to the age question, while no parent has said yes.
export async function restartAge() {
  const user = await signedIn();
  const service = serviceClient();
  const { data: profile } = await service.from("profiles").select("parent_consent_at").eq("id", user.id).single();
  if (!profile?.parent_consent_at) await service.from("profiles").update({ age_band: null }).eq("id", user.id);
  redirect("/bienvenue");
}

const ParentEmailSchema = z.string().trim().toLowerCase().email("Email invalide. Réessaie.").max(254);

const THROTTLED: Record<string, string> = {
  wait: "Un email vient de partir. Attends une minute avant de recommencer.",
  day: "Trop d'emails envoyés aujourd'hui. Réessaie demain.",
  recipient: "Cette adresse a déjà reçu plusieurs emails aujourd'hui. Réessaie demain.",
};

type ParentState = { error?: string; value?: string };

// Sends (or sends again) the consent email. Without an address, the one
// already given is reused.
export async function requestParentConsent(_prev: ParentState, formData: FormData): Promise<ParentState> {
  const user = await signedIn();
  const service = serviceClient();
  const [{ data: profile }, { data: existing }] = await Promise.all([
    service.from("profiles").select("username, age_band, age_band_set_at, parent_consent_at").eq("id", user.id).single(),
    service.from("parental_consents").select("parent_email, token_hash, expires_at, sent_count, last_sent_at").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!profile || profile.age_band !== "under_15" || profile.parent_consent_at) redirect("/bienvenue");

  const raw = formData.get("parent_email");
  const value = typeof raw === "string" ? raw : undefined;
  const parsed = raw == null && existing ? { success: true as const, data: existing.parent_email } : ParentEmailSchema.safeParse(raw ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, value };
  if (user.email && parsed.data === user.email.toLowerCase()) {
    return { error: "C'est l'adresse de ton compte. Mets l'email d'un parent.", value };
  }

  // The account's deadline does not move when the email is sent again.
  const startedAt = profile.age_band_set_at ? new Date(profile.age_band_set_at).getTime() : Date.now();
  const expiresAt = new Date(startedAt + CONSENT_DAYS * 86_400_000);
  if (expiresAt.getTime() <= Date.now()) {
    return { error: "Le délai de 14 jours est dépassé : ce compte va être supprimé. Tu pourras en créer un nouveau.", value };
  }

  // Atomic, per account and per address, kept across age changes.
  const { data: claim, error: claimError } = await service.rpc("claim_consent_email", {
    p_user: user.id,
    p_recipient_hash: hashConsentToken(parsed.data),
  });
  if (claimError) return { error: "Pas enregistré. Vérifie ta connexion et réessaie.", value };
  if (claim !== "ok") return { error: THROTTLED[claim as string] ?? THROTTLED.wait, value };

  const { token, hash } = newConsentToken();
  const { error } = await service.from("parental_consents").upsert({
    user_id: user.id,
    parent_email: parsed.data,
    token_hash: hash,
    expires_at: expiresAt.toISOString(),
    sent_count: (existing?.sent_count ?? 0) + 1,
    last_sent_at: new Date().toISOString(),
    confirmed_at: null,
  });
  if (error) return { error: "Pas enregistré. Vérifie ta connexion et réessaie.", value };

  const link = `${process.env.NEXT_PUBLIC_APP_URL}/accord/${token}`;
  const sent = await sendEmail({
    to: parsed.data,
    ...parentConsentEmail({ link, username: profile.username, deadline: frenchDate(expiresAt) }),
  });
  if (!sent) {
    // Nothing reached the parent : forget this attempt, the previous link still works.
    if (existing) {
      await service
        .from("parental_consents")
        .update({
          parent_email: existing.parent_email,
          token_hash: existing.token_hash,
          expires_at: existing.expires_at,
          sent_count: existing.sent_count,
          last_sent_at: existing.last_sent_at,
        })
        .eq("user_id", user.id);
    } else {
      await service.from("parental_consents").delete().eq("user_id", user.id);
    }
    return { error: "L'email n'est pas parti. Réessaie dans quelques minutes.", value };
  }
  await logServerEvent("parent_consent_requested", {}, { accountCreatedAt: user.created_at });
  redirect("/bienvenue?envoye=1");
}
