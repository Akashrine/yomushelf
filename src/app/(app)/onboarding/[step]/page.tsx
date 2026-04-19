import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingClient } from "./onboarding-client";

const VALID_STEPS = ["1", "2", "3"] as const;
type Step = (typeof VALID_STEPS)[number];

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step } = await params;

  if (!VALID_STEPS.includes(step as Step)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, username")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) redirect("/bibliotheque");

  // Fetch top 50 for the selection grid
  const { data: mangas } = await supabase
    .from("mangas")
    .select("id, title, author, publisher_fr, total_volumes, status, cover_url, top_50_rank, genre_primary")
    .eq("is_top_50_fr", true)
    .order("top_50_rank", { ascending: true });

  return (
    <OnboardingClient
      step={Number(step) as 1 | 2 | 3}
      mangas={mangas ?? []}
      username={profile?.username ?? null}
    />
  );
}
