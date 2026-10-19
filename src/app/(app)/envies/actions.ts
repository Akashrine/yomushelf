"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/supabase/session";
import { todayIso } from "@/lib/collection/value";
import { formValues, priceField, volumeNumberField } from "@/lib/collection/schema";

type ActionResult = { success: true } | { success: false; error: string };

async function getAuthed() {
  const { supabase, user } = await getSessionUser();
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
    .pipe(volumeNumberField.nullable()),
  target_price: priceField,
  priority: z.enum(["high", "low"]).optional(),
});

export async function addWishlistItem(formData: FormData): Promise<ActionResult> {
  const parsed = AddWishSchema.safeParse(
    formValues(formData, ["manga_id", "volume_number", "target_price", "priority"])
  );
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  // Adding again without a price keeps the price already noted.
  const row = { user_id: user.id, ...parsed.data };
  const { error } =
    parsed.data.target_price == null
      ? await supabase.from("wishlist_items").upsert(row, { onConflict: "user_id,manga_id,volume_number", ignoreDuplicates: true })
      : await supabase.from("wishlist_items").upsert(row, { onConflict: "user_id,manga_id,volume_number" });

  if (error) return { success: false, error: "Impossible d'ajouter cette envie. Réessaie." };
  revalidateWishes(parsed.data.manga_id);
  return { success: true };
}

function revalidateWishes(mangaId?: string) {
  revalidatePath("/envies");
  revalidatePath("/univers");
  revalidatePath("/decouvrir");
  revalidatePath("/bibliotheque");
  if (mangaId) revalidatePath(`/bibliotheque/${mangaId}`);
}

// ─────────────────────────────────────────
// setWishPriority — "prochain à acheter" or later.
// ─────────────────────────────────────────

const PrioritySchema = z.object({ id: z.string().uuid(), priority: z.enum(["high", "low"]) });

export async function setWishPriority(formData: FormData): Promise<ActionResult> {
  const parsed = PrioritySchema.safeParse(formValues(formData, ["id", "priority"]));
  if (!parsed.success) return { success: false, error: "Données invalides." };
  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };
  const { data, error } = await supabase
    .from("wishlist_items")
    .update({ priority: parsed.data.priority })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .select("manga_id");
  if (error) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };
  if (!data?.length) return { success: false, error: "Envie introuvable." };
  revalidateWishes(data[0].manga_id);
  return { success: true };
}

// ─────────────────────────────────────────
// removeWishlistItem
// ─────────────────────────────────────────

const WishIdSchema = z.object({ id: z.string().uuid() });

// Undo of "Je le veux" in Découvrir : that action wishes volume 1 of the
// series ; only that wish goes, other wishes of the series stay.
export async function undoSeriesWish(formData: FormData): Promise<ActionResult> {
  const parsed = z.object({ manga_id: z.string().uuid() }).safeParse(formValues(formData, ["manga_id"]));
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("user_id", user.id)
    .eq("manga_id", parsed.data.manga_id)
    .eq("volume_number", 1);
  if (error) return { success: false, error: "Erreur lors de la suppression." };
  revalidateWishes(parsed.data.manga_id);
  return { success: true };
}

export async function removeWishlistItem(formData: FormData): Promise<ActionResult> {
  const parsed = WishIdSchema.safeParse(formValues(formData, ["id"]));
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const { data, error } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .select("manga_id");

  if (error) return { success: false, error: "Erreur lors de la suppression." };
  if (!data?.length) return { success: false, error: "Envie introuvable." };
  revalidateWishes(data[0].manga_id);
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
