import type { MetadataRoute } from "next";
import { loadPublicSeries } from "@/lib/catalogue/public-series";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.yomushelf.com").trim();


export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const series = (await loadPublicSeries()).filter((s) => s.synopsis);
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
    ...series.map((s) => ({
      url: `${APP_URL}/serie/${s.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
