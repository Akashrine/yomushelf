"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/collection/value";
import { volumeNumberField } from "@/lib/collection/schema";
import {
  countVolumesRead,
  getReadingState,
  setReadingState,
  type ReadingState,
} from "@/lib/collection/readings-db";

// ─────────────────────────────────────────
// Reading actions of the reader space.
// The client never guesses : counters change only after the server
// confirms, and every result carries the state to restore for "Annuler".
// ─────────────────────────────────────────

export type ReadingResult =
  | { success: true; changed: boolean; previous: ReadingState; volumesRead: number | null }
  | { success: false; error: string };

const RefSchema = z.object({
  manga_id: z.string().uuid(),
  volume_number: volumeNumberField,
});

const SaveSchema = RefSchema.extend({
  // finish          : "Je l'ai fini !"  → read, finished today
  // finish_earlier  : "Déjà terminé ?" / "Je l'ai lu ailleurs" → read, date unknown
  // start           : "Je commence"
  // clear           : "Pas encore lu"
  intent: z.enum(["finish", "finish_earlier", "start", "clear"]),
});

const SAVE_ERROR = "Pas enregistré. Vérifie ta connexion et réessaie.";

function revalidateReader(mangaId: string) {
  revalidatePath("/bibliotheque");
  revalidatePath(`/bibliotheque/${mangaId}`);
  revalidatePath("/decouvrir");
  revalidatePath("/univers");
}

export async function saveReading(input: z.input<typeof SaveSchema>): Promise<ReadingResult> {
  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const { manga_id, volume_number, intent } = parsed.data;
  const ref = { userId: user.id, mangaId: manga_id, volumeNumber: volume_number };
  const previous = await getReadingState(supabase, ref);

  let next: ReadingState;
  switch (intent) {
    case "finish":
      next = previous?.status === "read" ? previous : { status: "read", finished_on: todayIso() };
      break;
    case "finish_earlier":
      next = previous?.status === "read" ? previous : { status: "read", finished_on: null };
      break;
    case "start":
      next = previous?.status === "reading" ? previous : { status: "reading", finished_on: null };
      break;
    case "clear":
      next = null;
      break;
  }

  const changed =
    (previous?.status ?? null) !== (next?.status ?? null) ||
    (previous?.finished_on ?? null) !== (next?.finished_on ?? null);

  if (changed) {
    const { error } = await setReadingState(supabase, ref, next);
    if (error) return { success: false, error: SAVE_ERROR };
    revalidateReader(manga_id);
  }

  return { success: true, changed, previous, volumesRead: await countVolumesRead(supabase, user.id).catch(() => null) };
}

// "Annuler" : put the reading back exactly as it was before the last action.
const RestoreSchema = RefSchema.extend({
  previous: z
    .object({
      status: z.enum(["reading", "read"]),
      finished_on: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable(),
    })
    .nullable(),
});

export async function restoreReading(input: z.input<typeof RestoreSchema>): Promise<ReadingResult> {
  const parsed = RestoreSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const { manga_id, volume_number, previous } = parsed.data;
  const ref = { userId: user.id, mangaId: manga_id, volumeNumber: volume_number };
  const current = await getReadingState(supabase, ref);

  const { error } = await setReadingState(supabase, ref, previous);
  if (error) return { success: false, error: SAVE_ERROR };
  revalidateReader(manga_id);

  return { success: true, changed: true, previous: current, volumesRead: await countVolumesRead(supabase, user.id).catch(() => null) };
}
