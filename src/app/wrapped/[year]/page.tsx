import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ensureWrappedSnapshot } from "./actions";
import { WrappedCarousel } from "@/components/wrapped/wrapped-carousel";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";

export const metadata: Metadata = { title: "Wrapped | Yomushelf" };

export default async function WrappedPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);
  if (isNaN(year) || year < 2020 || year > 2100) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_initials, public_slug")
    .eq("id", user.id)
    .single();

  const result = await ensureWrappedSnapshot(year);

  return (
    <>
      <PageViewTracker event="wrapped_viewed" params={{ year }} />
      <WrappedCarousel
        year={year}
        username={profile?.username ?? null}
        avatarInitials={profile?.avatar_initials ?? "?"}
        publicSlug={profile?.public_slug ?? null}
        result={result}
      />
    </>
  );
}
