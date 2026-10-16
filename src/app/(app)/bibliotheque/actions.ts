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
  revalidatePath("/bibliotheque");
  revalidatePath(`/bibliotheque/${mangaId}`);
  revalidatePath("/envies");
  revalidatePath("/decouvrir");
  revalidatePath("/univers");
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
  mode: z.enum(["add", "edit"]).default("add"),
});

export async function upsertUserVolume(formData: FormData): Promise<ActionResult> {
  const parsed = UpsertVolumeSchema.safeParse(
    formValues(formData, ["manga_id", "volume_number", "price_eur", "acquisition_type", "acquired_at", "reading", "mode"])
  );
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const d = parsed.data;

  if (d.mode === "add") {
    // INSERT and the unique constraint protect against both duplicate forms
    // and concurrent additions. An add must never become an implicit edit.
    const { error } = await supabase.from("user_volumes").insert({
      user_id: user.id,
      manga_id: d.manga_id,
      volume_number: d.volume_number,
      price_eur: d.price_eur,
      acquisition_type: d.acquisition_type,
      // Unknown unless the reader gives it : no date is made up.
      acquired_at: d.acquired_at ?? null,
    });
    if (error?.code === "23505") {
      return { success: false, error: "Ce tome est déjà sur ton étagère. Ouvre sa fiche pour le modifier." };
    }
    if (error) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };
  } else {
    const { data, error } = await supabase
      .from("user_volumes")
      .update({
        price_eur: d.price_eur,
        acquisition_type: d.acquisition_type,
        ...(d.acquired_at !== undefined ? { acquired_at: d.acquired_at } : {}),
      })
      .eq("user_id", user.id)
      .eq("manga_id", d.manga_id)
      .eq("volume_number", d.volume_number)
      .select("volume_number")
      .maybeSingle();
    if (error) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };
    if (!data) return { success: false, error: "Ce tome n'est plus sur ton étagère. Recharge la page." };
  }

  revalidateSeries(d.manga_id);
  try {
    const reading = await applyReadingChoice(
      supabase,
      { userId: user.id, mangaId: d.manga_id, volumeNumber: d.volume_number },
      d.reading
    );
    if (reading.error) throw new Error("Reading not saved");
  } catch {
    return { success: false, error: "Tome enregistré, mais sa lecture n'a pas pu être confirmée. Ouvre sa fiche pour la vérifier." };
  }

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
// markReadUpTo — "J'ai lu jusqu'au tome N".
// Every volume 1..N is read, owned or not, with an unknown date.
// Readings already finished keep their date. Returns exactly what changed,
// so the reader can undo it (undoReadUpTo).
// ─────────────────────────────────────────

const MarkReadSchema = z.object({
  manga_id: z.string().uuid(),
  up_to: z.coerce.number().int().positive().max(500),
});

export type ReadUpToResult =
  | { success: true; added: number[]; upgraded: number[] }
  | { success: false; error: string };

export async function markReadUpTo(formData: FormData): Promise<ReadUpToResult> {
  const parsed = MarkReadSchema.safeParse(formValues(formData, ["manga_id", "up_to"]));
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };
  const { manga_id, up_to } = parsed.data;

  const { data: upgradedRows, error: updateError } = await supabase
    .from("user_readings")
    .update({ status: "read", finished_on: null })
    .eq("user_id", user.id)
    .eq("manga_id", manga_id)
    .eq("status", "reading")
    .lte("volume_number", up_to)
    .select("volume_number");
  if (updateError) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };

  const rows = Array.from({ length: up_to }, (_, i) => ({
    user_id: user.id,
    manga_id,
    volume_number: i + 1,
    status: "read" as const,
    finished_on: null,
  }));
  const { data: addedRows, error } = await supabase
    .from("user_readings")
    .upsert(rows, { onConflict: "user_id,manga_id,volume_number", ignoreDuplicates: true })
    .select("volume_number");

  if (error) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };
  revalidateSeries(manga_id);
  return {
    success: true,
    added: (addedRows ?? []).map((r) => r.volume_number),
    upgraded: (upgradedRows ?? []).map((r) => r.volume_number),
  };
}

// Undo of markReadUpTo : removes the readings it created, puts back "en
// cours" on the ones it finished. Only touches undated readings, so a
// date typed since then is never lost.
const UndoReadSchema = z.object({
  manga_id: z.string().uuid(),
  added: z.array(z.number().int().positive().max(500)).max(500),
  upgraded: z.array(z.number().int().positive().max(500)).max(500),
});

export async function undoReadUpTo(input: { manga_id: string; added: number[]; upgraded: number[] }): Promise<ActionResult> {
  const parsed = UndoReadSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };
  const { manga_id, added, upgraded } = parsed.data;

  if (added.length) {
    const { error } = await supabase
      .from("user_readings")
      .delete()
      .eq("user_id", user.id)
      .eq("manga_id", manga_id)
      .eq("status", "read")
      .is("finished_on", null)
      .in("volume_number", added);
    if (error) return { success: false, error: "Pas annulé. Vérifie ta connexion et réessaie." };
  }
  if (upgraded.length) {
    const { error } = await supabase
      .from("user_readings")
      .update({ status: "reading" })
      .eq("user_id", user.id)
      .eq("manga_id", manga_id)
      .eq("status", "read")
      .is("finished_on", null)
      .in("volume_number", upgraded);
    if (error) return { success: false, error: "Pas annulé. Vérifie ta connexion et réessaie." };
  }
  revalidateSeries(manga_id);
  return { success: true };
}

// ─────────────────────────────────────────
// archiveSeries / restoreSeries — "Retirer de ma bibliothèque".
// The series leaves the shelf ; its volumes and readings stay, and it can
// come back as it was.
// ─────────────────────────────────────────

const SeriesRefSchema = z.object({ manga_id: z.string().uuid() });

async function setArchived(formData: FormData, archived: boolean): Promise<ActionResult> {
  const parsed = SeriesRefSchema.safeParse(formValues(formData, ["manga_id"]));
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const { data, error } = await supabase
    .from("user_collections")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("user_id", user.id)
    .eq("manga_id", parsed.data.manga_id)
    .select("manga_id");
  if (error) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };
  if (!data?.length) return { success: false, error: "Cette série n'est pas dans ta bibliothèque." };

  revalidateSeries(parsed.data.manga_id);
  return { success: true };
}

export async function archiveSeries(formData: FormData): Promise<ActionResult> {
  return setArchived(formData, true);
}

export async function restoreSeries(formData: FormData): Promise<ActionResult> {
  return setArchived(formData, false);
}

// ─────────────────────────────────────────
// deleteSeriesPermanently — separate, explicit, irreversible.
// The reader types the series title to confirm. Volumes, readings and
// wishes of that series go ; a private series created by the reader
// and used by nobody else goes too.
// ─────────────────────────────────────────

const DeleteSeriesSchema = SeriesRefSchema.extend({ confirm_title: z.string().trim().min(1) });

export async function deleteSeriesPermanently(formData: FormData): Promise<ActionResult> {
  const parsed = DeleteSeriesSchema.safeParse(formValues(formData, ["manga_id", "confirm_title"]));
  if (!parsed.success) return { success: false, error: "Écris le titre de la série pour confirmer." };

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };
  const { manga_id, confirm_title } = parsed.data;

  const { data: manga, error: mangaError } = await supabase
    .from("mangas")
    .select("id, title, created_by")
    .eq("id", manga_id)
    .maybeSingle();
  if (mangaError) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };
  if (!manga) return { success: false, error: "Série introuvable." };
  if (manga.title.trim().toLowerCase() !== confirm_title.toLowerCase()) {
    return { success: false, error: "Le titre ne correspond pas. Rien n'a été supprimé." };
  }

  const { error: wishError } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("user_id", user.id)
    .eq("manga_id", manga_id);
  if (wishError) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };

  // Cascades to the series' volumes and readings.
  const { error } = await supabase
    .from("user_collections")
    .delete()
    .eq("user_id", user.id)
    .eq("manga_id", manga_id);
  if (error) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };

  if (manga.created_by === user.id) {
    // Private series : nobody else can see it, so nothing else uses it.
    await supabase.from("mangas").delete().eq("id", manga_id).eq("created_by", user.id);
  }

  revalidateSeries(manga_id);
  return { success: true };
}

// ─────────────────────────────────────────
// setSeriesLiked — "J'ai aimé" / "Pas pour moi" / back to nothing said.
// What the reader says is kept apart from what they own or read.
// ─────────────────────────────────────────

const LikedSchema = SeriesRefSchema.extend({ liked: z.enum(["true", "false", "none"]) });

export async function setSeriesLiked(formData: FormData): Promise<ActionResult> {
  const parsed = LikedSchema.safeParse(formValues(formData, ["manga_id", "liked"]));
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const liked = parsed.data.liked === "none" ? null : parsed.data.liked === "true";
  // Saying it on a series not on the shelf yet puts it there (followed).
  const { error } = await supabase
    .from("user_collections")
    .upsert({ user_id: user.id, manga_id: parsed.data.manga_id, liked }, { onConflict: "user_id,manga_id" });
  if (error) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };

  revalidateSeries(parsed.data.manga_id);
  return { success: true };
}

// ─────────────────────────────────────────
// updatePrivateSeries — the reader edits their own private entry. RLS
// limits it to series they created ; nothing reaches the shared catalogue.
// ─────────────────────────────────────────

const PrivateSeriesSchema = SeriesRefSchema.extend({
  title: z.string().trim().min(1, "Écris le titre.").max(200, "Titre trop long (200 caractères maximum)."),
  author: z.string().trim().max(200, "Nom d'auteur trop long.").optional(),
  total_volumes: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number({ error: "Nombre de tomes invalide." }).int("Nombre de tomes invalide.").min(1, "Nombre de tomes invalide.").max(500, "500 tomes maximum.").nullable()),
});

export async function updatePrivateSeries(formData: FormData): Promise<ActionResult> {
  const parsed = PrivateSeriesSchema.safeParse(formValues(formData, ["manga_id", "title", "author", "total_volumes"]));
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };

  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };

  const { manga_id, title, author, total_volumes } = parsed.data;
  const { data, error } = await supabase
    .from("mangas")
    .update({ title: title.replace(/\s+/g, " "), author: author || null, total_volumes })
    .eq("id", manga_id)
    .eq("created_by", user.id)
    .select("id");
  if (error) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };
  if (!data?.length) return { success: false, error: "Seules tes fiches personnelles peuvent être modifiées." };

  revalidateSeries(manga_id);
  return { success: true };
}

// ─────────────────────────────────────────
// setReadingDate — correct when a read volume was finished (or forget it).
// ─────────────────────────────────────────

const ReadingDateSchema = z.object({
  manga_id: z.string().uuid(),
  volume_number: z.coerce.number().int().positive().max(500),
  finished_on: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.")
        .refine((d) => d <= todayIso(), "La date ne peut pas être dans le futur.")
        .nullable()
    ),
});

export async function setReadingDate(formData: FormData): Promise<ActionResult> {
  const parsed = ReadingDateSchema.safeParse(formValues(formData, ["manga_id", "volume_number", "finished_on"]));
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const { supabase, user } = await getAuthed();
  if (!user) return { success: false, error: "Non authentifié." };
  const { manga_id, volume_number, finished_on } = parsed.data;
  const { data, error } = await supabase
    .from("user_readings")
    .update({ finished_on })
    .eq("user_id", user.id)
    .eq("manga_id", manga_id)
    .eq("volume_number", volume_number)
    .eq("status", "read")
    .select("volume_number");
  if (error) return { success: false, error: "Pas enregistré. Vérifie ta connexion et réessaie." };
  if (!data?.length) return { success: false, error: "Ce tome n'est pas noté comme lu." };
  revalidateSeries(manga_id);
  return { success: true };
}
