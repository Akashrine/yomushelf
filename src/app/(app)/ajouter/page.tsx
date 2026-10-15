import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedVolumes, getReadings } from "@/lib/supabase/queries";
import { AppShell } from "@/components/app/app-shell";
import { AddFlow, type FlowSeries } from "@/components/ajouter/add-flow";

export const metadata: Metadata = { title: "Ajouter un manga" };

export default async function AjouterPage({
  searchParams,
}: {
  searchParams: Promise<{ serie?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ serie }, { data: profile }] = await Promise.all([
    searchParams,
    supabase.from("profiles").select("avatar_initials").eq("id", user.id).single(),
  ]);

  // "Ajouter des tomes" from a series page opens the flow on that series.
  let initial: FlowSeries | null = null;
  if (serie && /^[0-9a-f-]{36}$/i.test(serie)) {
    const { data: manga, error } = await supabase
      .from("mangas")
      .select("id, title, author, total_volumes, cover_url")
      .eq("id", serie)
      .maybeSingle();
    if (error) throw new Error("Impossible de charger cette série.");
    if (manga) {
      const [volumes, readings] = await Promise.all([
        getOwnedVolumes(supabase, user.id, manga.id),
        getReadings(supabase, user.id, manga.id),
      ]);
      initial = {
        key: manga.id,
        title: manga.title,
        author: manga.author,
        total_volumes: manga.total_volumes,
        cover_url: manga.cover_url,
        source: { source: "db", manga_id: manga.id },
        owned: volumes.map((v) => v.volume_number),
        read: readings.filter((r) => r.status === "read").map((r) => r.volume_number),
      };
    }
  }

  return (
    <AppShell active={null} avatarInitials={profile?.avatar_initials ?? undefined} hideMobileAdd>
      <AddFlow initial={initial} />
    </AppShell>
  );
}
