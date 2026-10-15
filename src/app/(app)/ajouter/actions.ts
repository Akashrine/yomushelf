"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { consumeImportQuota } from "@/lib/rate-limit/import-quota";
import { lookupByIsbn } from "@/lib/manga-api/google-books";
import { getMangaByIdMAL } from "@/lib/manga-api/mal";
import { cacheCoverToStorage } from "@/lib/manga-api/storage";
import { upsertUserVolume } from "@/app/(app)/bibliotheque/actions";
import type { MangaSearchResult } from "@/lib/manga-api/types";
import type { Database, Json } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { todayIso } from "@/lib/collection/value";
import { acquisitionTypeField, priceField } from "@/lib/collection/schema";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─────────────────────────────────────────
// addVolumeToCollection — one volume, its optional price and origin,
// and whether it was already read (date unknown).
// ─────────────────────────────────────────

type AddVolumeResult = { success: true } | { success: false; error: string };

export async function addVolumeToCollection(formData: FormData): Promise<AddVolumeResult> {
  return upsertUserVolume(formData);
}

// ─────────────────────────────────────────
// lookupIsbn — scanned barcode → manga info
// ─────────────────────────────────────────

const IsbnSchema = z.object({
  isbn: z
    .string()
    .min(10)
    .max(17)
    .transform((v) => v.replace(/[-\s]/g, ""))
    .pipe(z.string().regex(/^\d{13}$|^\d{9}[\dX]$/, "ISBN invalide.")),
});

type IsbnResult =
  | { success: true; manga: MangaSearchResult; volume_number: number | null }
  | { success: false; error: string };

export async function lookupIsbn(formData: FormData): Promise<IsbnResult> {
  const parsed = IsbnSchema.safeParse({ isbn: formData.get("isbn") });
  if (!parsed.success) return { success: false, error: "ISBN invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  if (!(await consumeImportQuota(user.id, "isbn_lookup"))) {
    return { success: false, error: "Trop de recherches. Attends une minute." };
  }

  const isbn = parsed.data.isbn;

  // 1. Check local DB first
  const { data: localVolume, error: lookupError } = await supabase
    .from("volumes")
    .select("volume_number, manga_id, mangas(*)")
    .eq("isbn_13", isbn)
    .maybeSingle();
  if (lookupError) return { success: false, error: "Impossible de vérifier le catalogue. Réessaie." };

  if (localVolume?.mangas) {
    const manga = localVolume.mangas as Record<string, unknown>;
    return {
      success: true,
      manga: {
        source: "db",
        // The add form recognises an existing series by its id.
        id: String(manga.id),
        external_id: String(manga.id),
        title: String(manga.title),
        author: manga.author ? String(manga.author) : null,
        publisher_fr: manga.publisher_fr ? String(manga.publisher_fr) : null,
        total_volumes: manga.total_volumes ? Number(manga.total_volumes) : null,
        status: (manga.status as MangaSearchResult["status"]) ?? "ongoing",
        avg_price_eur: Number(manga.avg_price_eur) || 7.5,
        genre_primary: manga.genre_primary ? String(manga.genre_primary) : null,
        cover_url: manga.cover_url ? String(manga.cover_url) : null,
        external_ids: { isbn_13: isbn },
      },
      volume_number: localVolume.volume_number,
    };
  }

  // 2. Google Books fallback
  let result: MangaSearchResult | null;
  try {
    result = await lookupByIsbn(isbn);
  } catch {
    return { success: false, error: "Le catalogue en ligne ne répond pas. Réessaie plus tard." };
  }
  if (!result) {
    return {
      success: false,
      error: "ISBN introuvable. Ajoute le tome manuellement.",
    };
  }

  return { success: true, manga: result, volume_number: null };
}

// ─────────────────────────────────────────
// addMangaFromExternalSource
//
// The client only says WHICH series : a catalogue id, a MyAnimeList id or
// an ISBN. Title, author, cover… are fetched here from the provider, never
// taken from the form, because they end up in the shared catalogue.
// ─────────────────────────────────────────

const VolumeNumberField = z.coerce.number().int().positive().max(999).optional();

const ImportSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("db"), manga_id: z.string().uuid(), volume_number: VolumeNumberField }),
  z.object({ source: z.literal("mal"), mal_id: z.coerce.number().int().positive(), volume_number: VolumeNumberField }),
  z.object({
    source: z.literal("google_books"),
    isbn: z.string().regex(/^\d{13}$/),
    volume_number: VolumeNumberField,
  }),
]);

type AddFromExternalResult =
  | { success: true; manga_id: string }
  | { success: false; error: string };

function formObject(formData: FormData) {
  const out: Record<string, string> = {};
  for (const key of ["source", "manga_id", "mal_id", "isbn", "volume_number"]) {
    const v = formData.get(key);
    if (typeof v === "string" && v !== "") out[key] = v;
  }
  return out;
}

// Inserts a provider record into the shared catalogue (service role).
async function insertCatalogEntry(meta: MangaSearchResult): Promise<string | null> {
  const service = getServiceClient();
  const id = crypto.randomUUID();
  const cover = meta.cover_url ? await cacheCoverToStorage(meta.cover_url, id) : null;
  const external_ids: Json = {
    ...(meta.external_ids.mal_id ? { mal_id: meta.external_ids.mal_id } : {}),
    ...(meta.external_ids.isbn_13 ? { isbn_13: meta.external_ids.isbn_13 } : {}),
  };
  const { data, error } = await service
    .from("mangas")
    .insert({
      id,
      title: meta.title.slice(0, 200),
      author: meta.author?.slice(0, 200) ?? null,
      publisher_fr: meta.publisher_fr,
      total_volumes: meta.total_volumes,
      status: meta.status,
      avg_price_eur: 7.5,
      genre_primary: meta.genre_primary,
      cover_url: cover,
      external_ids,
      is_top_50_fr: false,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

type Supabase = SupabaseClient<Database>;
type Resolved = { ok: true; manga_id: string } | { ok: false; error: string };

type SeriesSource =
  | { source: "db"; manga_id: string }
  | { source: "mal"; mal_id: number }
  | { source: "google_books"; isbn: string }
  | { source: "private"; title: string; author?: string | null; total_volumes?: number | null };

// Finds the catalogue series the reader means, creating it when needed :
// from a provider (server-side metadata, quota per account) or as a
// private series that only this reader can see.
async function resolveSeries(supabase: Supabase, userId: string, src: SeriesSource): Promise<Resolved> {
  if (src.source === "db") {
    const { data, error } = await supabase.from("mangas").select("id").eq("id", src.manga_id).maybeSingle();
    if (error) return { ok: false, error: "Impossible de vérifier le catalogue. Réessaie." };
    if (!data) return { ok: false, error: "Série introuvable." };
    return { ok: true, manga_id: data.id };
  }

  if (src.source === "private") {
    const title = src.title.trim().replace(/\s+/g, " ");
    // Same title typed twice : reuse the reader's own private series.
    const { data: mine, error: findError } = await supabase
      .from("mangas")
      .select("id, title")
      .eq("created_by", userId);
    if (findError) return { ok: false, error: "Impossible de vérifier le catalogue. Réessaie." };
    const same = (mine ?? []).find((m) => m.title.toLowerCase() === title.toLowerCase());
    if (same) return { ok: true, manga_id: same.id };
    if (!(await consumeImportQuota(userId, "import"))) {
      return { ok: false, error: "Tu as ajouté beaucoup de séries d'un coup. Réessaie dans une heure." };
    }
    // Readers may only write these columns (see the catalogue migration) ;
    // the id comes from the database.
    const { data: created, error } = await supabase
      .from("mangas")
      .insert({
        title,
        author: src.author?.trim() || null,
        total_volumes: src.total_volumes ?? null,
        status: "ongoing",
        created_by: userId,
      })
      .select("id")
      .single();
    if (error || !created) return { ok: false, error: "Impossible de créer cette série. Réessaie." };
    return { ok: true, manga_id: created.id };
  }

  // Already in the catalogue ? Reuse it, no quota spent.
  const key = src.source === "mal" ? { mal_id: src.mal_id } : { isbn_13: src.isbn };
  const { data: existing, error: lookupError } = await supabase
    .from("mangas")
    .select("id")
    .contains("external_ids", key)
    .limit(1)
    .maybeSingle();
  if (lookupError) return { ok: false, error: "Impossible de vérifier le catalogue. Réessaie." };
  if (existing) return { ok: true, manga_id: existing.id };

  if (!(await consumeImportQuota(userId, "import"))) {
    return { ok: false, error: "Tu as ajouté beaucoup de séries d'un coup. Réessaie dans une heure." };
  }
  let meta: MangaSearchResult | null = null;
  try {
    meta = src.source === "mal" ? await getMangaByIdMAL(src.mal_id) : await lookupByIsbn(src.isbn);
  } catch {
    return { ok: false, error: "Le catalogue en ligne ne répond pas. Réessaie plus tard." };
  }
  if (!meta) return { ok: false, error: "Série introuvable." };
  const id = await insertCatalogEntry(meta);
  if (!id) return { ok: false, error: "Erreur lors de l'ajout du manga." };
  return { ok: true, manga_id: id };
}

// Makes sure the series is on the reader's shelf, bringing it back if it
// was archived. Never touches existing volumes or readings.
async function ensureOnShelf(supabase: Supabase, userId: string, mangaId: string): Promise<boolean> {
  const { error } = await supabase.from("user_collections").upsert(
    { user_id: userId, manga_id: mangaId, owned_volumes: [], status: "not_started" },
    { onConflict: "user_id,manga_id", ignoreDuplicates: true }
  );
  if (error) return false;
  const { error: unarchiveError } = await supabase
    .from("user_collections")
    .update({ archived_at: null })
    .eq("user_id", userId)
    .eq("manga_id", mangaId)
    .not("archived_at", "is", null);
  return !unarchiveError;
}

function revalidateLibrary(mangaId?: string) {
  revalidatePath("/bibliotheque");
  if (mangaId) revalidatePath(`/bibliotheque/${mangaId}`);
  revalidatePath("/envies");
  revalidatePath("/decouvrir");
  revalidatePath("/univers");
}

export async function addMangaFromExternalSource(
  formData: FormData
): Promise<AddFromExternalResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const parsed = ImportSchema.safeParse(formObject(formData));
  if (!parsed.success) return { success: false, error: "Données invalides." };
  const d = parsed.data;

  const resolved = await resolveSeries(supabase, user.id, d);
  if (!resolved.ok) return { success: false, error: resolved.error };
  const manga_id = resolved.manga_id;

  if (d.volume_number) {
    const volumeFormData = new FormData();
    volumeFormData.set("manga_id", manga_id);
    volumeFormData.set("volume_number", String(d.volume_number));
    for (const key of ["price_eur", "acquisition_type", "reading"]) {
      const value = formData.get(key);
      if (value != null) volumeFormData.set(key, value);
    }
    const addResult = await addVolumeToCollection(volumeFormData);
    if (!addResult.success) return { success: false, error: addResult.error };
  } else if (!(await ensureOnShelf(supabase, user.id, manga_id))) {
    return { success: false, error: "Erreur lors de l'ajout. Réessaie." };
  }

  revalidateLibrary(manga_id);
  return { success: true, manga_id };
}

// ─────────────────────────────────────────
// addSeriesToLibrary — the common add flow (new series, several volumes,
// "J'ai le tome 15 !", private series). One call :
//   which series · which volumes are at home · where the reading is.
// Existing volumes keep their price, origin and date ; existing
// readings keep their date. Unknown dates stay unknown.
// ─────────────────────────────────────────

const MAX_VOLUME = 500;
const VolumeNumber = z
  .number({ error: "Numéro de tome invalide." })
  .int("Numéro de tome invalide.")
  .positive("Numéro de tome invalide.")
  .max(MAX_VOLUME, `${MAX_VOLUME} tomes maximum.`);

const AddSeriesSchema = z.object({
  series: z.discriminatedUnion("source", [
    z.object({ source: z.literal("db"), manga_id: z.string().uuid() }),
    z.object({ source: z.literal("mal"), mal_id: z.number().int().positive() }),
    z.object({ source: z.literal("google_books"), isbn: z.string().regex(/^\d{13}$/) }),
    z.object({
      source: z.literal("private"),
      title: z.string().trim().min(1, "Écris le titre.").max(200, "Titre trop long (200 caractères maximum)."),
      author: z.string().trim().max(200, "Nom d'auteur trop long.").nullish(),
      total_volumes: VolumeNumber.nullish(),
    }),
  ]),
  owned: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("none") }),
    z.object({ mode: z.literal("range"), to: VolumeNumber, from: VolumeNumber.default(1) }),
    z.object({ mode: z.literal("list"), volumes: z.array(VolumeNumber).min(1, "Choisis au moins un tome.").max(MAX_VOLUME) }),
  ]),
  reading: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("none") }),
    z.object({ mode: z.literal("all_owned") }),
    // Only the volumes added by this request ("Je l'ai déjà lu").
    z.object({ mode: z.literal("added") }),
    z.object({ mode: z.literal("up_to"), to: VolumeNumber }),
  ]),
  // The volumes arrived now (a new purchase) or were already on the shelf.
  arrived_now: z.boolean().default(false),
  acquisition_type: acquisitionTypeField,
  price_eur: priceField,
});

export type AddSeriesInput = z.input<typeof AddSeriesSchema>;
export type AddSeriesResult =
  | { success: true; manga_id: string; added_volumes: number; added_readings: number }
  | { success: false; error: string };

export async function addSeriesToLibrary(input: AddSeriesInput): Promise<AddSeriesResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const parsed = AddSeriesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const d = parsed.data;
  if (d.owned.mode === "range" && d.owned.from > d.owned.to) {
    return { success: false, error: "Le premier tome doit venir avant le dernier." };
  }

  const resolved = await resolveSeries(supabase, user.id, d.series);
  if (!resolved.ok) return { success: false, error: resolved.error };
  const manga_id = resolved.manga_id;

  if (!(await ensureOnShelf(supabase, user.id, manga_id))) {
    return { success: false, error: "Erreur lors de l'ajout. Réessaie." };
  }

  const ownedSpec = d.owned;
  const owned =
    ownedSpec.mode === "none"
      ? []
      : ownedSpec.mode === "range"
        ? Array.from({ length: ownedSpec.to - ownedSpec.from + 1 }, (_, i) => ownedSpec.from + i)
        : [...new Set(ownedSpec.volumes)].sort((a, b) => a - b);

  let addedVolumes = 0;
  if (owned.length) {
    const { data: inserted, error } = await supabase
      .from("user_volumes")
      .upsert(
        owned.map((n) => ({
          user_id: user.id,
          manga_id,
          volume_number: n,
          price_eur: d.price_eur,
          acquisition_type: d.acquisition_type,
          acquired_at: d.arrived_now ? todayIso() : null,
        })),
        { onConflict: "user_id,manga_id,volume_number", ignoreDuplicates: true }
      )
      .select("volume_number");
    if (error) return { success: false, error: "Les tomes n'ont pas été enregistrés. Réessaie." };
    addedVolumes = inserted?.length ?? 0;
  }

  // "J'ai lu tous ceux que j'ai" covers the volumes already at home too,
  // not only the ones typed now.
  let atHome = owned;
  if (d.reading.mode === "all_owned") {
    const { data: rows, error } = await supabase
      .from("user_volumes")
      .select("volume_number")
      .eq("user_id", user.id)
      .eq("manga_id", manga_id);
    if (error) return { success: false, error: "Les lectures n'ont pas été enregistrées. Réessaie." };
    atHome = [...new Set([...owned, ...(rows ?? []).map((r) => r.volume_number)])].sort((a, b) => a - b);
  }

  let addedReadings = 0;
  const readVolumes =
    d.reading.mode === "none"
      ? []
      : d.reading.mode === "all_owned"
        ? atHome
        : d.reading.mode === "added"
          ? owned
          : Array.from({ length: d.reading.to }, (_, i) => i + 1);
  if (readVolumes.length) {
    // A volume in progress becomes read ; finished readings keep their date.
    const { error: upgradeError } = await supabase
      .from("user_readings")
      .update({ status: "read", finished_on: null })
      .eq("user_id", user.id)
      .eq("manga_id", manga_id)
      .eq("status", "reading")
      .in("volume_number", readVolumes);
    if (upgradeError) return { success: false, error: "Les lectures n'ont pas été enregistrées. Réessaie." };
    const { data: inserted, error } = await supabase
      .from("user_readings")
      .upsert(
        readVolumes.map((n) => ({ user_id: user.id, manga_id, volume_number: n, status: "read" as const, finished_on: null })),
        { onConflict: "user_id,manga_id,volume_number", ignoreDuplicates: true }
      )
      .select("volume_number");
    if (error) return { success: false, error: "Les lectures n'ont pas été enregistrées. Réessaie." };
    addedReadings = inserted?.length ?? 0;
  }

  revalidateLibrary(manga_id);
  return { success: true, manga_id, added_volumes: addedVolumes, added_readings: addedReadings };
}
