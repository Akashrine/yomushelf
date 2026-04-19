import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { fetchOgProfile } from "@/lib/og/data";
import type { Database } from "@/lib/types/database";
import { PublicHeader } from "@/components/public/public-header";
import { PublicProfileCard } from "@/components/public/public-profile-card";
import { PublicStatsRow } from "@/components/public/public-stats-row";
import { PublicTopCollection } from "@/components/public/public-top-collection";
import { PublicHighlights } from "@/components/public/public-highlights";
import { PublicCTAFooter } from "@/components/public/public-cta-footer";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await fetchOgProfile(slug);

  if (!profile) return { title: "Profil introuvable | Yomushelf" };

  const name = profile.username ?? slug;
  const desc = `${profile.total_series} séries · ${profile.total_volumes} tomes sur Yomushelf.`;
  const ogUrl = `${process.env.NEXT_PUBLIC_APP_URL}/og/profile/${slug}`;

  return {
    title: `@${name} sur Yomushelf`,
    description: desc,
    openGraph: {
      type: "profile",
      title: `@${name} sur Yomushelf`,
      description: desc,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/u/${slug}`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `Collection de @${name}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `@${name} sur Yomushelf`,
      description: desc,
      images: [ogUrl],
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { slug } = await params;

  // Fetch public profile data
  const profile = await fetchOgProfile(slug);

  if (!profile) {
    // Distinguish 404 vs private
    const service = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: exists } = await service
      .from("profiles")
      .select("is_public")
      .eq("public_slug", slug)
      .maybeSingle();

    if (!exists) notFound();

    // Profile exists but is private
    return <PrivateState slug={slug} />;
  }

  // Check if visitor is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: `@${profile.username ?? slug}`,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/u/${slug}`,
    description: `${profile.total_series} séries · ${profile.total_volumes} tomes`,
  };

  return (
    <>
      <PageViewTracker event="public_profile_viewed" params={{ slug }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen" style={{ background: "var(--background)" }}>
        <PublicHeader isAuthenticated={isAuthenticated} />

        <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-8">
          <PublicProfileCard profile={profile} slug={slug} />
          <PublicStatsRow profile={profile} />
          <PublicTopCollection covers={profile.top_covers} />
          <PublicHighlights highlights={profile.highlights} />
        </main>

        {!isAuthenticated && <PublicCTAFooter />}
      </div>
    </>
  );
}

function PrivateState({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      <PublicHeader isAuthenticated={false} />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <span style={{ fontSize: 48 }}>🔒</span>
        <h1 className="text-xl font-semibold">Ce profil est privé</h1>
        <p className="text-sm max-w-xs" style={{ color: "var(--muted)" }}>
          @{slug} n'a pas encore rendu sa collection publique.
        </p>
      </div>
    </div>
  );
}
