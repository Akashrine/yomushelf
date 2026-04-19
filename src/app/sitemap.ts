import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://yomushelf.app";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const service = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profiles } = await service
    .from("profiles")
    .select("public_slug")
    .eq("is_public", true)
    .not("public_slug", "is", null);

  const profileUrls: MetadataRoute.Sitemap = (profiles ?? [])
    .filter((p) => p.public_slug)
    .map((p) => ({
      url: `${APP_URL}/u/${p.public_slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  return [
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${APP_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${APP_URL}/signup`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    ...profileUrls,
  ];
}
