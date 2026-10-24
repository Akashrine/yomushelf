// What a reader under 15 may ADD from the shared catalogue : only series
// whose age is verified for the whole series (CNLJ selection) and at most
// 14. Same source of truth as Découvrir (verifiedAge), a stricter bound.
// Series already on their shelf stay theirs, and a personal series (their
// own text, no cover, no synopsis) is always allowed. Parents consented to
// the youth selection, not to a search box on the whole of MyAnimeList.

import { verifiedAge, type CatalogueEntry } from "./suggest";

export const MINOR_MAX_AGE = 14;

export type AgeRow = Pick<CatalogueEntry, "audience_min_age" | "audience_age_source" | "audience_age_scope">;

export function minorMayAdd(row: AgeRow): boolean {
  const age = verifiedAge({ ...row } as CatalogueEntry);
  return age != null && age <= MINOR_MAX_AGE;
}

export const MINOR_REFUSAL =
  "Cette série n'est pas disponible sur ton compte. Tu peux en choisir une dans la liste, ou l'ajouter toi-même.";
