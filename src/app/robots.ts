import type { MetadataRoute } from "next";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.yomushelf.com").trim();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/u/", "/wrapped/", "/og/", "/decouvrir", "/univers", "/collection", "/envies", "/bibliotheque", "/profil", "/ajouter", "/onboarding", "/api/"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
