"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/collection/value";
import {
  VolumeDetailsSchema,
  acquisitionTypeField,
  formValues,
  priceField,
} from "@/lib/collection/schema";
import { getReadingState, setReadingState } from "@/lib/collection/readings-db";

type ActionResult = { success: true } | { success: false; error: string };

async function getAuthed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function revalidateSeries(mangaId: string) {
  revalidatePath("/collection");
  revalidatePath("/bibliotheque");
  revalidatePath(`/bibliotheque/${mangaId}`);
  revalidatePath("/parent");
  revalidatePath("/envies");
}

// Applies a reading choice from a volume form. Never invents a date:
// "already read" is stored with an unknown finished_on.
async function applyReadingChoice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ref: { userId: string; mangaId: string; volumeNumber: number },
  choice: "unchanged" | "none" | "reading" | "read_earlier"
) {
  if (choice === "unchanged") return { error: null };
  const current = await getReadingState(supabase, ref);
  if (choice === "none") return current ? setReadingState(supabase, ref, null) : { error: null };
  if (choice === "reading") {
    return current?.status === "reading"
      ? { error: null }
      : setReadingState(supabase, ref, { status: "reading", finished_on: null });
  }
  return current?.status === "read"
    ? { error: null }
    : setReadingState(supabase, ref, { status: "read", finished_on: null });
}

// ─────────────────────────────────────────
// upsertUserVolume — the volume is at home (price, how it arrived),
// plus an optional reading choice.
// ─────────────────────────────────────────

const UpsertVolumeSchema = VolumeDetailsSchema.extend({
  manga_id: z.string().uuid(),
  volume_number: z.coerce.number().int().positive(),
});

export async function upsertUserVolume(formData: FormData): Promise<ActionResult> {
  const parsed = UpsertVolumeSchema.safeParse(
    formValues(formData, ["manga_id", "volume_number", "price_eur", "acquisition_type", "acquired_at", "reading"])
  );
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const d = parsed.data;

  const { data: existing } = await supabase
    .from("user_volumes")
    .select("acquired_at")
    .eq("user_id", user.id)
    .eq("manga_id", d.manga_id)
    .eq("volume_number", d.volume_number)
    .maybeSingle();

  const { error } = await supabase.from("user_volumes").upsert(
    {
      user_id: user.id,
      manga_id: d.manga_id,
      volume_number: d.volume_number,
      price_eur: d.price_eur,
      acquisition_type: d.acquisition_type,
      // A volume added right now arrived today; an edit keeps what was known.
      acquired_at: d.acquired_at ?? (existing ? existing.acquired_at : todayIso()),
    },
    { onConflict: "user_id,manga_id,volume_number" }
  );
  if (error) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };

  const reading = await applyReadingChoice(
    supabase,
    { userId: user.id, mangaId: d.manga_id, volumeNumber: d.volume_number },
    d.reading
  );
  if (reading.error) return { success: false, error: "Tome enregistré, mais pas sa lecture. Réessaie." };

  revalidateSeries(d.manga_id);
  return { success: true };
}

// ─────────────────────────────────────────
// removeUserVolume — the volume is no longer at home.
// Its reading stays : a returned or given-away book was still read.
// ─────────────────────────────────────────

const VolumeRefSchema = z.object({
  manga_id: z.string().uuid(),
  volume_number: z.coerce.number().int().positive(),
});

export async function removeUserVolume(formData: FormData): Promise<ActionResult> {
  const parsed = VolumeRefSchema.safeParse(formValues(formData, ["manga_id", "volume_number"]));
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("user_volumes")
    .delete()
    .eq("user_id", user.id)
    .eq("manga_id", parsed.data.manga_id)
    .eq("volume_number", parsed.data.volume_number);

  if (error) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };
  revalidateSeries(parsed.data.manga_id);
  return { success: true };
}

// ─────────────────────────────────────────
// addVolumeRange — "j'ai les tomes 1 à 14"
// Usually an existing shelf being typed in : arrival date unknown.
// ─────────────────────────────────────────

const AddVolumeRangeSchema = z
  .object({
    manga_id: z.string().uuid(),
    from: z.coerce.number().int().positive(),
    to: z.coerce.number().int().positive(),
    price_eur: priceField,
    acquisition_type: acquisitionTypeField,
  })
  .refine((d) => d.from <= d.to && d.to - d.from < 500, {
    message: "Plage invalide.",
  });

export async function addVolumeRange(formData: FormData): Promise<ActionResult> {
  const parsed = AddVolumeRangeSchema.safeParse(
    formValues(formData, ["manga_id", "from", "to", "price_eur", "acquisition_type"])
  );
  if (!parsed.success) return { success: false, error: "Plage invalide." };

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const { manga_id, from, to, price_eur, acquisition_type } = parsed.data;
  const rows = Array.from({ length: to - from + 1 }, (_, i) => ({
    user_id: user.id,
    manga_id,
    volume_number: from + i,
    price_eur,
    acquisition_type,
    acquired_at: null,
  }));

  const { error } = await supabase
    .from("user_volumes")
    .upsert(rows, { onConflict: "user_id,manga_id,volume_number", ignoreDuplicates: true });

  if (error) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };
  revalidateSeries(manga_id);
  return { success: true };
}

// ─────────────────────────────────────────
// markReadUpTo — parent space bulk entry : "lu jusqu'au tome N".
// Every volume 1..N is read, owned or not, with an unknown date.
// Readings already finished keep their date.
// ─────────────────────────────────────────

const MarkReadSchema = z.object({
  manga_id: z.string().uuid(),
  up_to: z.coerce.number().int().positive().max(500),
});

export async function markReadUpTo(formData: FormData): Promise<ActionResult> {
  const parsed = MarkReadSchema.safeParse(formValues(formData, ["manga_id", "up_to"]));
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };
  const { manga_id, up_to } = parsed.data;

  const { error: updateError } = await supabase
    .from("user_readings")
    .update({ status: "read", finished_on: null })
    .eq("user_id", user.id)
    .eq("manga_id", manga_id)
    .eq("status", "reading")
    .lte("volume_number", up_to);
  if (updateError) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };

  const rows = Array.from({ length: up_to }, (_, i) => ({
    user_id: user.id,
    manga_id,
    volume_number: i + 1,
    status: "read" as const,
    finished_on: null,
  }));
  const { error } = await supabase
    .from("user_readings")
    .upsert(rows, { onConflict: "user_id,manga_id,volume_number", ignoreDuplicates: true });

  if (error) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };
  revalidateSeries(manga_id);
  return { success: true };
}

// ─────────────────────────────────────────
// updateStatus — series-level reading status
// ─────────────────────────────────────────

const UpdateStatusSchema = z.object({
  manga_id: z.string().uuid(),
  status: z.enum(["not_started", "reading", "caught_up", "completed", "dropped"]),
});

export async function updateStatus(formData: FormData): Promise<ActionResult> {
  const parsed = UpdateStatusSchema.safeParse(formValues(formData, ["manga_id", "status"]));
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("user_collections")
    .update({ status: parsed.data.status })
    .eq("user_id", user.id)
    .eq("manga_id", parsed.data.manga_id);

  if (error) return { success: false, error: "Erreur lors de la mise à jour." };
  revalidateSeries(parsed.data.manga_id);
  return { success: true };
}
