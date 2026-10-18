"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CONSENT_DAYS, HEARD_FROM } from "@/lib/account/gate";
import { newConsentToken, serviceClient } from "@/lib/server/consent";
import { parentConsentEmail, sendEmail } from "@/lib/server/email";
import { logServerEvent } from "@/lib/server/analytics";

// The child's session is checked here ; the writes go through the service
// role, since clients may not change these columns (migration 20261018000300).
async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

const RESEND_WAIT_MS = 60_000;
const MAX_SENDS_PER_DAY = 5;

export async function chooseAgeBand(formData: FormData) {
  const band = z.enum(["under_15", "15_plus"]).safeParse(formData.get("band"));
  if (!band.success) redirect("/bienvenue");
  const user = await signedIn();
  const service = serviceClient();
  const { data: profile } = await service.from("profiles").select("parent_consent_at").eq("id", user.id).single();
  // A parent's yes is final here : only the parent's link can undo it.
  if (profile?.parent_consent_at) redirect("/bienvenue");

  if (band.data === "15_plus") await service.from("parental_consents").delete().eq("user_id", user.id);
  await service.from("profiles").update({ age_band: band.data, age_band_set_at: new Date().toISOString() }).eq("id", user.id);
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
  if (!profile?.parent_consent_at) {
    await service.from("parental_consents").delete().eq("user_id", user.id);
    await service.from("profiles").update({ age_band: null, age_band_set_at: null }).eq("id", user.id);
  }
  redirect("/bienvenue");
}

const ParentEmailSchema = z.string().trim().toLowerCase().email("Email invalide. Réessaie.").max(254);

// Sends (or sends again) the consent email. Without an address, the one
// already given is reused.
export async function requestParentConsent(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const user = await signedIn();
  const service = serviceClient();
  const [{ data: profile }, { data: existing }] = await Promise.all([
    service.from("profiles").select("username, age_band, age_band_set_at, parent_consent_at").eq("id", user.id).single(),
    service.from("parental_consents").select("parent_email, token_hash, expires_at, sent_count, last_sent_at").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!profile || profile.age_band !== "under_15" || profile.parent_consent_at) redirect("/bienvenue");

  const raw = formData.get("parent_email");
  const parsed = raw == null && existing ? { success: true as const, data: existing.parent_email } : ParentEmailSchema.safeParse(raw ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const now = Date.now();
  const last = existing ? new Date(existing.last_sent_at).getTime() : 0;
  if (now - last < RESEND_WAIT_MS) return { error: "Email déjà envoyé. Attends une minute avant de recommencer." };
  const sentToday = existing && now - last < 86_400_000 ? existing.sent_count : 0;
  if (sentToday >= MAX_SENDS_PER_DAY) return { error: "Trop d'emails envoyés aujourd'hui. Réessaie demain." };

  // The account's deadline does not move when the email is sent again.
  const startedAt = profile.age_band_set_at ? new Date(profile.age_band_set_at).getTime() : now;
  const expiresAt = new Date(startedAt + CONSENT_DAYS * 86_400_000);
  const { token, hash } = newConsentToken();
  const { error } = await service.from("parental_consents").upsert({
    user_id: user.id,
    parent_email: parsed.data,
    token_hash: hash,
    expires_at: expiresAt.toISOString(),
    sent_count: sentToday + 1,
    last_sent_at: new Date(now).toISOString(),
    confirmed_at: null,
  });
  if (error) return { error: "Pas enregistré. Vérifie ta connexion et réessaie." };

  const link = `${process.env.NEXT_PUBLIC_APP_URL}/accord/${token}`;
  const sent = await sendEmail({ to: parsed.data, ...parentConsentEmail({ link, username: profile.username, days: CONSENT_DAYS }) });
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
    return { error: "L'email n'est pas parti. Réessaie dans quelques minutes." };
  }
  await logServerEvent("parent_consent_requested", {}, { accountCreatedAt: user.created_at });
  redirect("/bienvenue?envoye=1");
}
