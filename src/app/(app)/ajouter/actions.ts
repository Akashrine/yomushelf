"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getIsbnLimiter } from "@/lib/rate-limit";
import { lookupByIsbn } from "@/lib/manga-api/google-books";
import { cacheCoverToStorage } from "@/lib/manga-api/storage";
import {
  getUserCollection,
  updateCollectionVolumes,
} from "@/lib/supabase/queries";
import type { MangaSearchResult } from "@/lib/manga-api/types";
import type { Json } from "@/lib/types/database";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─────────────────────────────────────────
// addVolumeToCollection
// ─────────────────────────────────────────

const AddVolumeSchema = z.object({
  manga_id: z.string().uuid(),
  volume_number: z.coerce.number().int().positive(),
});

type AddVolumeResult =
  | { success: true; owned_volumes: number[] }
  | { success: false; error: string };

export async function addVolumeToCollection(
  formData: FormData
): Promise<AddVolumeResult> {
  const parsed = AddVolumeSchema.safeParse({
    manga_id: formData.get("manga_id"),
    volume_number: formData.get("volume_number"),
  });

  if (!parsed.success) {
    return { success: false, error: "Données invalides." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const { manga_id, volume_number } = parsed.data;

  const existing = await getUserCollection(supabase, user.id, manga_id);

  if (existing) {
    if (existing.owned_volumes.includes(volume_number)) {
      return { success: true, owned_volumes: existing.owned_volumes };
    }

    const newVolumes = [...existing.owned_volumes, volume_number].sort(
      (a, b) => a - b
    );
    const { error } = await updateCollectionVolumes(
      supabase,
      existing.id,
      newVolumes
    );
    if (error) return { success: false, error: "Erreur lors de l'ajout." };
    return { success: true, owned_volumes: newVolumes };
  }

  // First volume for this series
  const { error } = await supabase.from("user_collections").insert({
    user_id: user.id,
    manga_id,
    owned_volumes: [volume_number],
    status: "not_started",
  });

  if (error) return { success: false, error: "Erreur lors de l'ajout." };
  return { success: true, owned_volumes: [volume_number] };
}

// ─────────────────────────────────────────
// lookupIsbn — scanned barcode → manga info
// ─────────────────────────────────────────

const IsbnSchema = z.object({
  isbn: z
    .string()
    .min(10)
    .max(17)
    .transform((v) => v.replace(/[-\s]/g, "")),
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

  const limiter = getIsbnLimiter();
  const { success: allowed } = await limiter.limit(user.id);
  if (!allowed) {
    return { success: false, error: "Trop de scans. Attends une minute." };
  }

  const isbn = parsed.data.isbn;

  // 1. Check local DB first
  const { data: localVolume } = await supabase
    .from("volumes")
    .select("volume_number, manga_id, mangas(*)")
    .eq("isbn_13", isbn)
    .maybeSingle();

  if (localVolume?.mangas) {
    const manga = localVolume.mangas as Record<string, unknown>;
    return {
      success: true,
      manga: {
        source: "db",
        external_id: String(manga.id),
        title: String(manga.title),
        author: manga.author ? String(manga.author) : null,
        publisher_fr: manga.publisher_fr ? String(manga.publisher_fr) : null,
        total_volumes: manga.total_volumes ? Number(manga.total_volumes) : null,
        status: (manga.status as MangaSearchResult["status"]) ?? "ongoing",
        avg_price_eur: Number(manga.avg_price_eur) ?? 7.5,
        genre_primary: manga.genre_primary ? String(manga.genre_primary) : null,
        cover_url: manga.cover_url ? String(manga.cover_url) : null,
        external_ids: { isbn_13: isbn },
      },
      volume_number: localVolume.volume_number,
    };
  }

  // 2. Google Books fallback
  const result = await lookupByIsbn(isbn);
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
// ─────────────────────────────────────────

const AddFromExternalSchema = z.object({
  existing_manga_id: z.string().uuid().optional(),
  mal_id: z.coerce.number().int().positive().optional(),
  isbn_13: z.string().optional(),
  title: z.string().min(1).optional(),
  author: z.string().optional(),
  publisher_fr: z.string().optional(),
  total_volumes: z.coerce.number().int().positive().optional(),
  status: z.enum(["ongoing", "completed", "paused"]).default("ongoing"),
  cover_url: z.string().url().optional(),
  genre_primary: z.string().optional(),
  volume_number: z.coerce.number().int().positive().optional(),
});

type AddFromExternalResult =
  | { success: true; manga_id: string }
  | { success: false; error: string };

export async function addMangaFromExternalSource(
  formData: FormData
): Promise<AddFromExternalResult> {
  const parsed = AddFromExternalSchema.safeParse(
    Object.fromEntries(formData.entries())
  );
  if (!parsed.success) {
    return { success: false, error: "Données invalides." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const d = parsed.data;
  let manga_id: string | null = d.existing_manga_id ?? null;

  // If we already have a DB id, skip all lookups and inserts
  if (!manga_id && d.mal_id) {
    const { data } = await supabase
      .from("mangas")
      .select("id")
      .contains("external_ids", { mal_id: d.mal_id })
      .maybeSingle();
    if (data) manga_id = data.id;
  }

  if (!manga_id) {
    if (!d.title) return { success: false, error: "Titre manquant." };

    let cachedCover: string | null = null;
    if (d.cover_url) {
      const tempId = crypto.randomUUID();
      cachedCover = await cacheCoverToStorage(d.cover_url, tempId);
    }

    const external_ids: Json = {
      ...(d.mal_id ? { mal_id: d.mal_id } : {}),
      ...(d.isbn_13 ? { isbn_13: d.isbn_13 } : {}),
    };

    // Use service role — RLS blocks user inserts into mangas table
    const service = getServiceClient();
    const { data: newManga, error } = await service
      .from("mangas")
      .insert({
        title: d.title,
        author: d.author ?? null,
        publisher_fr: d.publisher_fr ?? null,
        total_volumes: d.total_volumes ?? null,
        status: d.status ?? "ongoing",
        avg_price_eur: 7.5,
        genre_primary: d.genre_primary ?? null,
        cover_url: cachedCover,
        external_ids,
        is_top_50_fr: false,
      })
      .select("id")
      .single();

    if (error || !newManga) {
      return { success: false, error: "Erreur lors de l'ajout du manga." };
    }
    manga_id = newManga.id;
  }

  if (!manga_id) return { success: false, error: "Manga introuvable." };

  if (d.volume_number) {
    const volumeFormData = new FormData();
    volumeFormData.set("manga_id", manga_id);
    volumeFormData.set("volume_number", String(d.volume_number));
    const addResult = await addVolumeToCollection(volumeFormData);
    if (!addResult.success) return { success: false, error: addResult.error };
  } else {
    await supabase.from("user_collections").upsert(
      { user_id: user.id, manga_id, owned_volumes: [], status: "not_started" },
      { onConflict: "user_id,manga_id", ignoreDuplicates: true }
    );
  }

  return { success: true, manga_id };
}
