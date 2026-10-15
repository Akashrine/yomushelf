"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/collection/value";
import {
  VolumeDetailsSchema,
  formValues,
  priceField,
} from "@/lib/collection/schema";

type ActionResult = { success: true } | { success: false; error: string };

async function getAuthed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// ─────────────────────────────────────────
// upsertUserVolume — add or edit one volume (price, how it arrived, read)
// ─────────────────────────────────────────

const UpsertVolumeSchema = VolumeDetailsSchema.extend({
  manga_id: z.string().uuid(),
  volume_number: z.coerce.number().int().positive(),
});

export async function upsertUserVolume(formData: FormData): Promise<ActionResult> {
  const parsed = UpsertVolumeSchema.safeParse(
    formValues(formData, [
      "manga_id",
      "volume_number",
      "price_eur",
      "acquisition_type",
      "read_status",
      "acquired_at",
    ])
  );
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const d = parsed.data;

  // Keep the original read date when the volume was already read.
  const { data: existing } = await supabase
    .from("user_volumes")
    .select("read_status, read_at, acquired_at")
    .eq("user_id", user.id)
    .eq("manga_id", d.manga_id)
    .eq("volume_number", d.volume_number)
    .maybeSingle();

  const read_at =
    d.read_status === "read"
      ? existing?.read_status === "read"
        ? existing.read_at ?? todayIso()
        : todayIso()
      : null;

  const { error } = await supabase.from("user_volumes").upsert(
    {
      user_id: user.id,
      manga_id: d.manga_id,
      volume_number: d.volume_number,
      price_eur: d.price_eur,
      acquisition_type: d.acquisition_type,
      read_status: d.read_status,
      read_at,
      acquired_at: d.acquired_at ?? existing?.acquired_at ?? todayIso(),
    },
    { onConflict: "user_id,manga_id,volume_number" }
  );

  if (error) return { success: false, error: "Erreur lors de l'enregistrement. Réessaie." };
  return { success: true };
}

// ─────────────────────────────────────────
// removeUserVolume
// ─────────────────────────────────────────

const VolumeRefSchema = z.object({
  manga_id: z.string().uuid(),
  volume_number: z.coerce.number().int().positive(),
});

export async function removeUserVolume(formData: FormData): Promise<ActionResult> {
  const parsed = VolumeRefSchema.safeParse(
    formValues(formData, ["manga_id", "volume_number"])
  );
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("user_volumes")
    .delete()
    .eq("user_id", user.id)
    .eq("manga_id", parsed.data.manga_id)
    .eq("volume_number", parsed.data.volume_number);

  if (error) return { success: false, error: "Erreur lors de la suppression." };
  return { success: true };
}

// ─────────────────────────────────────────
// addVolumeRange — bulk add, same price for all, bought & unread
// ─────────────────────────────────────────

const AddVolumeRangeSchema = z
  .object({
    manga_id: z.string().uuid(),
    from: z.coerce.number().int().positive(),
    to: z.coerce.number().int().positive(),
    price_eur: priceField,
  })
  .refine((d) => d.from <= d.to && d.to - d.from < 500, {
    message: "Plage invalide.",
  });

export async function addVolumeRange(formData: FormData): Promise<ActionResult> {
  const parsed = AddVolumeRangeSchema.safeParse(
    formValues(formData, ["manga_id", "from", "to", "price_eur"])
  );
  if (!parsed.success) return { success: false, error: "Plage invalide." };

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const { manga_id, from, to, price_eur } = parsed.data;
  const today = todayIso();
  const rows = Array.from({ length: to - from + 1 }, (_, i) => ({
    user_id: user.id,
    manga_id,
    volume_number: from + i,
    price_eur,
    acquired_at: today,
  }));

  const { error } = await supabase
    .from("user_volumes")
    .upsert(rows, { onConflict: "user_id,manga_id,volume_number", ignoreDuplicates: true });

  if (error) return { success: false, error: "Erreur lors de l'ajout." };
  return { success: true };
}

// ─────────────────────────────────────────
// markReadUpTo — "j'ai lu jusqu'au tome N"
// ─────────────────────────────────────────

const MarkReadSchema = z.object({
  manga_id: z.string().uuid(),
  up_to: z.coerce.number().int().positive(),
});

export async function markReadUpTo(formData: FormData): Promise<ActionResult> {
  const parsed = MarkReadSchema.safeParse(formValues(formData, ["manga_id", "up_to"]));
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("user_volumes")
    .update({ read_status: "read", read_at: todayIso() })
    .eq("user_id", user.id)
    .eq("manga_id", parsed.data.manga_id)
    .lte("volume_number", parsed.data.up_to)
    .neq("read_status", "read");

  if (error) return { success: false, error: "Erreur lors de la mise à jour." };
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
  return { success: true };
}
