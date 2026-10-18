import type { AgeBand, HeardFrom } from "@/lib/types/database";

// What a signed-in reader must answer before using the app, in order :
// age, how they heard of Yomushelf, then (under 15) a parent's consent.
export type GateStep = "age" | "source" | "parent" | "pending" | "ready";

export const CONSENT_DAYS = 14; // a pending link expires, an unconfirmed account is deleted

export const HEARD_FROM: { key: HeardFrom; label: string }[] = [
  { key: "ami", label: "Un copain, une copine" },
  { key: "parent", label: "Mes parents" },
  { key: "librairie", label: "En librairie" },
  { key: "mediatheque_cdi", label: "Médiathèque ou CDI" },
  { key: "salon", label: "Un salon" },
  { key: "reseaux", label: "TikTok, Insta, YouTube" },
  { key: "google", label: "Google" },
  { key: "autre", label: "Autre, ou je ne sais plus" },
];

export function gateStep(
  profile: { age_band: AgeBand | null; heard_from: HeardFrom | null; parent_consent_at: string | null } | null,
  consentRequested: boolean
): GateStep {
  if (!profile?.age_band) return "age";
  if (!profile.heard_from) return "source";
  if (profile.age_band === "under_15" && !profile.parent_consent_at) return consentRequested ? "pending" : "parent";
  return "ready";
}

// "j***@gmail.com" : enough for the child to recognise the address, no more.
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 1)}***@${domain}`;
}

// "1er novembre", "14 novembre" (Paris time)
export function frenchDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).formatToParts(date);
  return parts.map((p) => (p.type === "day" && p.value === "1" ? "1er" : p.value)).join("");
}
