import { createClient } from "@supabase/supabase-js";
import { fetchImageSafely, UnsafeImageError } from "./safe-image";

const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

// Browsers and the CDN keep covers instead of re-checking them on every
// visit (the bucket default sent "no-cache"). A series cover may be replaced
// under the same path : one week. A volume cover is stored under its ISBN,
// whose cover never changes : one year.
const SERIES_CACHE = "604800";
const VOLUME_CACHE = "31536000";

// Re-caches a provider cover into Supabase Storage.
// Only trusted provider URLs are downloaded (see safe-image.ts).
// Returns the public Supabase Storage URL, or null when the image is refused
// or the upload fails : a missing cover never blocks an import.
export async function cacheCoverToStorage(remoteUrl: string, mangaId: string): Promise<string | null> {
  return cacheImage(remoteUrl, `covers/${mangaId}`, SERIES_CACHE);
}

export async function cacheVolumeCoverToStorage(remoteUrl: string, isbn13: string): Promise<string | null> {
  if (!/^\d{13}$/.test(isbn13)) return null;
  return cacheImage(remoteUrl, `covers/volumes/${isbn13}`, VOLUME_CACHE);
}

// "En images" : covers/pictures/<manga id>/<n>, replaced when re-fetched.
export async function cacheMangaPictureToStorage(remoteUrl: string, mangaId: string, index: number): Promise<string | null> {
  return cacheImage(remoteUrl, `covers/pictures/${mangaId}/${index}`, SERIES_CACHE);
}

async function cacheImage(remoteUrl: string, pathWithoutExtension: string, cacheControl: string): Promise<string | null> {
  try {
    const { bytes, contentType } = await fetchImageSafely(remoteUrl);
    const path = `${pathWithoutExtension}.${EXTENSIONS[contentType]}`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.storage
      .from("manga-covers")
      .upload(path, bytes, { contentType, upsert: true, cacheControl });
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
