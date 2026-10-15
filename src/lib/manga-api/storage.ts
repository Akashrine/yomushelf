import { createClient } from "@supabase/supabase-js";
import { fetchImageSafely, UnsafeImageError } from "./safe-image";

const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

// Re-caches a provider cover into Supabase Storage.
// Only trusted provider URLs are downloaded (see safe-image.ts).
// Returns the public Supabase Storage URL, or null when the image is refused
// or the upload fails : a missing cover never blocks an import.
export async function cacheCoverToStorage(
  remoteUrl: string,
  mangaId: string
): Promise<string | null> {
  try {
    const { bytes, contentType } = await fetchImageSafely(remoteUrl);
    const path = `covers/${mangaId}.${EXTENSIONS[contentType]}`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.storage
      .from("manga-covers")
      .upload(path, bytes, { contentType, upsert: true });
    if (error) return null;

    const { data } = supabase.storage.from("manga-covers").getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    if (err instanceof UnsafeImageError) {
      console.warn(`[covers] refused ${err.reason}`);
    }
    return null;
  }
}
