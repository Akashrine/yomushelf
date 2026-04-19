import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProfilClient } from "@/components/profil/profil-client";

export const metadata: Metadata = { title: "Mon profil" };

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_initials, created_at, is_public, bio, public_slug")
    .eq("id", user.id)
    .single();

  const { data: statsRaw } = await supabase.rpc("get_user_stats", {
    p_user_id: user.id,
  });
  const stats = statsRaw?.[0] ?? null;

  return (
    <ProfilClient
      email={user.email ?? ""}
      username={profile?.username ?? null}
      avatarInitials={profile?.avatar_initials ?? "?"}
      memberSince={profile?.created_at ?? user.created_at}
      stats={stats}
      isPublic={profile?.is_public ?? false}
      bio={profile?.bio ?? null}
      publicSlug={profile?.public_slug ?? null}
    />
  );
}
