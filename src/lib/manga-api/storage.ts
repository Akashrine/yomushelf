import { createClient } from "@supabase/supabase-js";

// Re-caches a remote cover URL into Supabase Storage.
// Returns the public Supabase Storage URL, or null on failure.
export async function cacheCoverToStorage(
  remoteUrl: string,
  mangaId: string
): Promise<string | null> {
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const path = `covers/${mangaId}.${ext}`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const arrayBuffer = await res.arrayBuffer();
    const { error } = await supabase.storage
      .from("manga-covers")
      .upload(path, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (error) return null;

    const { data } = supabase.storage
      .from("manga-covers")
      .getPublicUrl(path);

    return data.publicUrl;
  } catch {
    return null;
  }
}
