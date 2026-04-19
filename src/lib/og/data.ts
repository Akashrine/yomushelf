import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/types/database";

type PublicProfile =
  Database["public"]["Functions"]["get_public_profile"]["Returns"][number];

export type TopCover = {
  manga_id: string;
  title: string;
  cover_url: string | null;
  owned_count: number;
};

export type Highlights = {
  most_volumes: { title: string; cover_url: string | null; owned: number } | null;
  completed_series: number;
  top_genre: string | null;
};

export type OgProfile = Omit<PublicProfile, "top_covers" | "highlights"> & {
  top_covers: TopCover[];
  highlights: Highlights;
};

export type OgWrapped = {
  username: string | null;
  avatar_initials: string;
  year: number;
  total_volumes_added: number;
  total_budget_spent: number;
  top_3_series: { manga_id: string; title: string; cover_url: string | null; volumes_owned: number }[];
  top_genre: string | null;
  delta_vs_previous_year_pct: number | null;
};

function service() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function fetchOgProfile(slug: string): Promise<OgProfile | null> {
  const supabase = service();
  const { data } = await supabase.rpc("get_public_profile", { p_slug: slug });
  const row = data?.[0];
  if (!row) return null;

  return {
    ...row,
    top_covers: (row.top_covers as Json as TopCover[]) ?? [],
    highlights: (row.highlights as Json as Highlights) ?? {
      most_volumes: null,
      completed_series: 0,
      top_genre: null,
    },
  };
}

export async function fetchOgWrapped(
  slug: string,
  year: number
): Promise<OgWrapped | null> {
  const supabase = service();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_initials")
    .eq("public_slug", slug)
    .eq("is_public", true)
    .single();

  if (!profile) return null;

  const { data: snap } = await supabase
    .from("wrapped_snapshots")
    .select("*")
    .eq("user_id", profile.id)
    .eq("year", year)
    .single();

  if (!snap) return null;

  return {
    username: profile.username,
    avatar_initials: profile.avatar_initials,
    year: snap.year,
    total_volumes_added: snap.total_volumes_added,
    total_budget_spent: Number(snap.total_budget_spent),
    top_3_series: (snap.top_3_series as Json as OgWrapped["top_3_series"]) ?? [],
    top_genre: snap.top_genre,
    delta_vs_previous_year_pct: snap.delta_vs_previous_year_pct
      ? Number(snap.delta_vs_previous_year_pct)
      : null,
  };
}
