"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const IdsSchema = z.array(z.string().uuid()).max(50);

type Result = { success: true } | { success: false; error: string };

// Save a step's selections without completing onboarding
export async function saveStepSelection(ids: string[]): Promise<Result> {
  const parsed = IdsSchema.safeParse(ids);
  if (!parsed.success) return { success: false, error: "Sélection invalide." };

  if (parsed.data.length === 0) return { success: true };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const rows = parsed.data.map((manga_id) => ({
    user_id: user.id,
    manga_id,
    owned_volumes: [] as number[],
    status: "not_started" as const,
  }));

  const { error } = await supabase
    .from("user_collections")
    .upsert(rows, { onConflict: "user_id,manga_id", ignoreDuplicates: true });

  if (error) return { success: false, error: "Erreur lors de la sauvegarde." };
  return { success: true };
}

// Final step: save last selections + mark onboarding complete
export async function upsertOnboardingSelection(
  formData: FormData
): Promise<Result> {
  const raw = formData.get("manga_ids");
  let ids: string[] = [];

  if (raw) {
    try {
      ids = JSON.parse(String(raw));
    } catch {
      return { success: false, error: "Données invalides." };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  if (ids.length > 0) {
    const parsed = IdsSchema.safeParse(ids);
    if (!parsed.success) return { success: false, error: "Sélection invalide." };

    const rows = parsed.data.map((manga_id) => ({
      user_id: user.id,
      manga_id,
      owned_volumes: [] as number[],
      status: "not_started" as const,
    }));

    const { error } = await supabase
      .from("user_collections")
      .upsert(rows, { onConflict: "user_id,manga_id", ignoreDuplicates: true });

    if (error) return { success: false, error: "Erreur lors de la sauvegarde." };
  }

  await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  return { success: true };
}
