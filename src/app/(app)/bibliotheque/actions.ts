"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getUserCollection,
  updateCollectionVolumes,
} from "@/lib/supabase/queries";
import type { Database } from "@/lib/types/database";

type CollectionUpdate =
  Database["public"]["Tables"]["user_collections"]["Update"];

const UpdateProgressSchema = z.object({
  manga_id: z.string().uuid(),
  last_read_volume: z.coerce.number().int().min(0),
  status: z
    .enum(["not_started", "reading", "caught_up", "completed", "dropped"])
    .optional(),
});

type UpdateProgressResult =
  | { success: true }
  | { success: false; error: string };

export async function updateReadingProgress(
  formData: FormData
): Promise<UpdateProgressResult> {
  const parsed = UpdateProgressSchema.safeParse({
    manga_id: formData.get("manga_id"),
    last_read_volume: formData.get("last_read_volume"),
    status: formData.get("status") ?? undefined,
  });

  if (!parsed.success) {
    return { success: false, error: "Données invalides." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const { manga_id, last_read_volume, status } = parsed.data;

  const updates: CollectionUpdate = { last_read_volume };

  if (status) {
    updates.status = status;
  } else {
    const col = await getUserCollection(supabase, user.id, manga_id);
    if (col?.status === "not_started" && last_read_volume > 0) {
      updates.status = "reading";
    }
  }

  const { error } = await supabase
    .from("user_collections")
    .update(updates)
    .eq("user_id", user.id)
    .eq("manga_id", manga_id);

  if (error) return { success: false, error: "Erreur lors de la mise à jour." };
  return { success: true };
}

const ToggleVolumeSchema = z.object({
  manga_id: z.string().uuid(),
  volume_number: z.coerce.number().int().positive(),
});

export async function toggleVolume(
  formData: FormData
): Promise<UpdateProgressResult> {
  const parsed = ToggleVolumeSchema.safeParse({
    manga_id: formData.get("manga_id"),
    volume_number: formData.get("volume_number"),
  });
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const { manga_id, volume_number } = parsed.data;
  const col = await getUserCollection(supabase, user.id, manga_id);

  if (!col) {
    // First volume added — create the row
    const { error } = await supabase.from("user_collections").insert({
      user_id: user.id,
      manga_id,
      owned_volumes: [volume_number],
      status: "not_started",
    });
    if (error) return { success: false, error: "Erreur lors de l'ajout." };
    return { success: true };
  }

  const has = col.owned_volumes.includes(volume_number);
  const newVolumes = has
    ? col.owned_volumes.filter((v) => v !== volume_number)
    : [...col.owned_volumes, volume_number].sort((a, b) => a - b);

  const { error } = await updateCollectionVolumes(supabase, col.id, newVolumes);
  if (error) return { success: false, error: "Erreur lors de la mise à jour." };
  return { success: true };
}

const UpdateStatusSchema = z.object({
  manga_id: z.string().uuid(),
  status: z.enum(["not_started", "reading", "caught_up", "completed", "dropped"]),
});

export async function updateStatus(
  formData: FormData
): Promise<UpdateProgressResult> {
  const parsed = UpdateStatusSchema.safeParse({
    manga_id: formData.get("manga_id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("user_collections")
    .update({ status: parsed.data.status })
    .eq("user_id", user.id)
    .eq("manga_id", parsed.data.manga_id);

  if (error) return { success: false, error: "Erreur lors de la mise à jour." };
  return { success: true };
}

const AddVolumeRangeSchema = z
  .object({
    manga_id: z.string().uuid(),
    from: z.coerce.number().int().positive(),
    to: z.coerce.number().int().positive(),
  })
  .refine((d) => d.from <= d.to, { message: "Plage invalide." });

export async function addVolumeRange(
  formData: FormData
): Promise<UpdateProgressResult> {
  const parsed = AddVolumeRangeSchema.safeParse({
    manga_id: formData.get("manga_id"),
    from: formData.get("from"),
    to: formData.get("to"),
  });
  if (!parsed.success) return { success: false, error: "Plage invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const { manga_id, from, to } = parsed.data;
  const range = Array.from({ length: to - from + 1 }, (_, i) => from + i);

  const col = await getUserCollection(supabase, user.id, manga_id);

  if (!col) {
    const { error } = await supabase.from("user_collections").insert({
      user_id: user.id,
      manga_id,
      owned_volumes: range,
      status: "not_started",
    });
    if (error) return { success: false, error: "Erreur lors de l'ajout." };
    return { success: true };
  }

  const newVolumes = [...new Set([...col.owned_volumes, ...range])].sort(
    (a, b) => a - b
  );
  const { error } = await updateCollectionVolumes(supabase, col.id, newVolumes);
  if (error) return { success: false, error: "Erreur lors de la mise à jour." };
  return { success: true };
}

const RemoveVolumeSchema = z.object({
  manga_id: z.string().uuid(),
  volume_number: z.coerce.number().int().positive(),
});

export async function removeVolumeFromCollection(
  formData: FormData
): Promise<UpdateProgressResult> {
  const parsed = RemoveVolumeSchema.safeParse({
    manga_id: formData.get("manga_id"),
    volume_number: formData.get("volume_number"),
  });
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const { manga_id, volume_number } = parsed.data;
  const col = await getUserCollection(supabase, user.id, manga_id);

  if (!col)
    return {
      success: false,
      error: "Série introuvable dans ta collection.",
    };

  const newVolumes = col.owned_volumes.filter((v) => v !== volume_number);
  const { error } = await updateCollectionVolumes(supabase, col.id, newVolumes);

  if (error) return { success: false, error: "Erreur lors de la suppression." };
  return { success: true };
}
