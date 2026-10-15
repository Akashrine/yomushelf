"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { consumeImportQuota } from "@/lib/rate-limit/import-quota";
import { lookupByIsbn } from "@/lib/manga-api/google-books";
import { getMangaByIdMAL } from "@/lib/manga-api/mal";
import { cacheCoverToStorage } from "@/lib/manga-api/storage";
import { upsertUserVolume } from "@/app/(app)/bibliotheque/actions";
import type { MangaSearchResult } from "@/lib/manga-api/types";
import type { Json } from "@/lib/types/database";

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

  let manga_id: string | null = null;

  if (d.source === "db") {
    const { data, error } = await supabase.from("mangas").select("id").eq("id", d.manga_id).maybeSingle();
    if (error) return { success: false, error: "Impossible de vérifier le catalogue. Réessaie." };
    if (!data) return { success: false, error: "Série introuvable." };
    manga_id = data.id;
  } else {
    // Already in the catalogue ? Reuse it, no quota spent.
    const key = d.source === "mal" ? { mal_id: d.mal_id } : { isbn_13: d.isbn };
    const { data: existing, error: lookupError } = await supabase
      .from("mangas")
      .select("id")
      .contains("external_ids", key)
      .limit(1)
      .maybeSingle();
    if (lookupError) return { success: false, error: "Impossible de vérifier le catalogue. Réessaie." };

    if (existing) {
      manga_id = existing.id;
    } else {
      if (!(await consumeImportQuota(user.id, "import"))) {
        return { success: false, error: "Tu as ajouté beaucoup de séries d'un coup. Réessaie dans une heure." };
      }
      let meta: MangaSearchResult | null = null;
      try {
        meta = d.source === "mal" ? await getMangaByIdMAL(d.mal_id) : await lookupByIsbn(d.isbn);
      } catch {
        return { success: false, error: "Le catalogue en ligne ne répond pas. Réessaie plus tard." };
      }
      if (!meta) return { success: false, error: "Série introuvable." };
      manga_id = await insertCatalogEntry(meta);
      if (!manga_id) return { success: false, error: "Erreur lors de l'ajout du manga." };
    }
  }

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
  } else {
    const { error } = await supabase.from("user_collections").upsert(
      { user_id: user.id, manga_id, owned_volumes: [], status: "not_started" },
      { onConflict: "user_id,manga_id", ignoreDuplicates: true }
    );
    if (error) return { success: false, error: "Erreur lors de l'ajout. Réessaie." };
  }

  return { success: true, manga_id };
}
