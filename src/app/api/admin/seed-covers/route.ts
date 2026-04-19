import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchMangaMAL } from "@/lib/manga-api/mal";
import { cacheCoverToStorage } from "@/lib/manga-api/storage";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === "manga-covers");
  if (!bucketExists) {
    await supabase.storage.createBucket("manga-covers", { public: true });
  }

  // Fetch all mangas without covers
  const { data: mangas } = await supabase
    .from("mangas")
    .select("id, title")
    .is("cover_url", null);

  if (!mangas?.length) {
    return NextResponse.json({ message: "No mangas to update.", updated: 0 });
  }

  let updated = 0;
  const errors: string[] = [];

  for (const manga of mangas) {
    try {
      const results = await searchMangaMAL(manga.title, 3);
      const match = results.find(
        (r) => r.title.toLowerCase() === manga.title.toLowerCase()
      ) ?? results[0];

      if (!match?.cover_url) continue;

      const cachedUrl = await cacheCoverToStorage(match.cover_url, manga.id);
      if (!cachedUrl) continue;

      await supabase
        .from("mangas")
        .update({ cover_url: cachedUrl })
        .eq("id", manga.id);

      updated++;
      // Polite delay to avoid MAL rate-limit (200ms between requests)
      await new Promise((r) => setTimeout(r, 200));
    } catch {
      errors.push(manga.title);
    }
  }

  return NextResponse.json({ updated, errors, total: mangas.length });
}
