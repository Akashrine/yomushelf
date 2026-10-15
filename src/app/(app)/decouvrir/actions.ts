"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { formValues } from "@/lib/collection/schema";
import { GENRES } from "@/lib/discovery/suggest";

type ActionResult = { success: true } | { success: false; error: string };

async function getAuthed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function revalidateDiscovery() {
  revalidatePath("/decouvrir");
  revalidatePath("/univers");
}

const SeriesRef = z.object({ manga_id: z.string().uuid() });

// "Pas pour moi" on a suggestion : not proposed again until brought back.
export async function dismissSuggestion(formData: FormData): Promise<ActionResult> {
  const parsed = SeriesRef.safeParse(formValues(formData, ["manga_id"]));
  if (!parsed.success) return { success: false, error: "Données invalides." };
  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("discovery_dismissals")
    .upsert({ user_id: user.id, manga_id: parsed.data.manga_id }, { onConflict: "user_id,manga_id", ignoreDuplicates: true });
  if (error) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };
  revalidateDiscovery();
  return { success: true };
}

// Undo one, or bring back every suggestion set aside.
export async function restoreSuggestions(formData: FormData): Promise<ActionResult> {
  const raw = formValues(formData, ["manga_id"]);
  const parsed = z.object({ manga_id: z.string().uuid().optional() }).safeParse(raw);
  if (!parsed.success) return { success: false, error: "Données invalides." };
  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  let query = supabase.from("discovery_dismissals").delete().eq("user_id", user.id);
  if (parsed.data.manga_id) query = query.eq("manga_id", parsed.data.manga_id);
  const { error } = await query;
  if (error) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };
  revalidateDiscovery();
  return { success: true };
}

// Tastes the reader declares : genres liked, genres avoided.
const Genre = z.enum(GENRES);
const TastesSchema = z
  .object({ liked: z.array(Genre).max(GENRES.length), avoided: z.array(Genre).max(GENRES.length) })
  .refine((t) => !t.liked.some((g) => t.avoided.includes(g)), "Un genre ne peut pas être aimé et évité à la fois.");

export async function saveDeclaredTastes(input: { liked: string[]; avoided: string[] }): Promise<ActionResult> {
  const parsed = TastesSchema.safeParse({ liked: [...new Set(input?.liked ?? [])], avoided: [...new Set(input?.avoided ?? [])] });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("profiles")
    .update({ liked_genres: parsed.data.liked, avoided_genres: parsed.data.avoided })
    .eq("id", user.id);
  if (error) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };
  revalidateDiscovery();
  return { success: true };
}
