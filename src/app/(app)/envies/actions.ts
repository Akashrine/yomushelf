"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/collection/value";
import { formValues, priceField } from "@/lib/collection/schema";

type ActionResult = { success: true } | { success: false; error: string };

async function getAuthed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// ─────────────────────────────────────────
// addWishlistItem
// ─────────────────────────────────────────

const AddWishSchema = z.object({
  manga_id: z.string().uuid(),
  volume_number: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().int().positive().nullable()),
  target_price: priceField,
});

export async function addWishlistItem(formData: FormData): Promise<ActionResult> {
  const parsed = AddWishSchema.safeParse(
    formValues(formData, ["manga_id", "volume_number", "target_price"])
  );
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const { error } = await supabase.from("wishlist_items").upsert(
    { user_id: user.id, ...parsed.data },
    { onConflict: "user_id,manga_id,volume_number" }
  );

  if (error) return { success: false, error: "Impossible d'ajouter cette envie. Réessaie." };
  return { success: true };
}

// ─────────────────────────────────────────
// removeWishlistItem
// ─────────────────────────────────────────

const WishIdSchema = z.object({ id: z.string().uuid() });

export async function removeWishlistItem(formData: FormData): Promise<ActionResult> {
  const parsed = WishIdSchema.safeParse(formValues(formData, ["id"]));
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: "Erreur lors de la suppression." };
  return { success: true };
}

// ─────────────────────────────────────────
// acquireWishlistItem — "je l'ai eu !" : the wish becomes a volume at home.
// The DB trigger removes the wish once the volume exists.
// ─────────────────────────────────────────

const AcquireSchema = WishIdSchema.extend({
  acquisition_type: z.enum(["bought", "gift"]).default("bought"),
  // What was actually paid (or the shop price of a gift). Empty = unknown :
  // the wish's estimate is never copied in as an expense.
  price_eur: priceField,
});

export async function acquireWishlistItem(formData: FormData): Promise<ActionResult> {
  const parsed = AcquireSchema.safeParse(formValues(formData, ["id", "acquisition_type", "price_eur"]));
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const { data: wish, error: wishError } = await supabase
    .from("wishlist_items")
    .select("manga_id, volume_number")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (wishError) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };
  if (!wish) return { success: false, error: "Envie introuvable." };
  if (wish.volume_number == null) {
    return { success: false, error: "Choisis d'abord le numéro du tome." };
  }

  // A volume already at home keeps its own data.
  const { error } = await supabase.from("user_volumes").upsert(
    {
      user_id: user.id,
      manga_id: wish.manga_id,
      volume_number: wish.volume_number,
      price_eur: parsed.data.price_eur,
      acquisition_type: parsed.data.acquisition_type,
      acquired_at: todayIso(),
    },
    { onConflict: "user_id,manga_id,volume_number", ignoreDuplicates: true }
  );
  if (error) return { success: false, error: "Erreur lors de l'ajout. Réessaie." };

  // The insert trigger removes the wish ; an already-owned volume needs it done here.
  await supabase.from("wishlist_items").delete().eq("id", parsed.data.id).eq("user_id", user.id);

  revalidatePath("/envies");
  revalidatePath("/bibliotheque");
  revalidatePath(`/bibliotheque/${wish.manga_id}`);
  revalidatePath("/univers");
  return { success: true };
}
