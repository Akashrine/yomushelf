import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://yomushelf.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/u/", "/wrapped/"],
        disallow: ["/collection", "/envies", "/bibliotheque", "/profil", "/ajouter", "/onboarding", "/api/"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
