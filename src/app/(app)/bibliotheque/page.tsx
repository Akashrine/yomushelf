import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { LibraryShell } from "@/components/bibliotheque/library-shell";
import { LibraryGrid } from "@/components/bibliotheque/library-grid";
import { LibrarySkeleton } from "@/components/bibliotheque/library-skeleton";

export const metadata: Metadata = { title: "Ma bibliothèque" };

export default async function BibliotequePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch collection with manga details
  const { data: collections } = await supabase
    .from("user_collections")
    .select(
      `
      id,
      owned_volumes,
      last_read_volume,
      status,
      updated_at,
      mangas (
        id, title, author, publisher_fr, total_volumes,
        status, avg_price_eur, genre_primary, cover_url, top_50_rank
      )
    `
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  // Fetch user stats via RPC
  const { data: statsRaw } = await supabase.rpc("get_user_stats", {
    p_user_id: user.id,
  });
  const stats = statsRaw?.[0] ?? null;

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_initials")
    .eq("id", user.id)
    .single();

  return (
    <LibraryShell
      username={profile?.username ?? null}
      avatarInitials={profile?.avatar_initials ?? "?"}
      stats={stats}
    >
      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryGrid collections={collections ?? []} />
      </Suspense>
    </LibraryShell>
  );
}
