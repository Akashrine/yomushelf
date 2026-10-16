import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedVolumes, getReadings } from "@/lib/supabase/queries";
import { AppShell } from "@/components/app/app-shell";
import { AddFlow, type FlowSeries } from "@/components/ajouter/add-flow";
import { QuickAdd } from "@/components/ajouter/quick-add";

export const metadata: Metadata = { title: "Ajouter un manga" };

export default async function AjouterPage({
  searchParams,
}: {
  searchParams: Promise<{ serie?: string; detaille?: string; bienvenue?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ serie, detaille, bienvenue }, { data: profile }] = await Promise.all([
    searchParams,
    supabase.from("profiles").select("avatar_initials, username").eq("id", user.id).single(),
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

  // The detailed flow : one series with gaps, dates, prices, or a series
  // missing from the catalogue. Otherwise the quick, multi-series add.
  if (initial || detaille) {
    return (
      <AppShell active={null} avatarInitials={profile?.avatar_initials ?? undefined} hideMobileAdd>
        <AddFlow initial={initial} />
      </AppShell>
    );
  }

  const [popular, owned, readings] = await Promise.all([
    supabase
      .from("mangas")
      .select("id, title, author, total_volumes, cover_url")
      .is("created_by", null)
      .is("merged_into", null)
      .eq("curated", true)
      .not("cover_url", "is", null)
      .order("top_50_rank", { ascending: true, nullsFirst: false })
      .order("title")
      .limit(60),
    getOwnedVolumes(supabase, user.id),
    getReadings(supabase, user.id),
  ]);
  if (popular.error) throw new Error("Impossible de charger les séries populaires.");
  // One card per title : the catalogue still holds a few duplicates.
  const seen = new Set<string>();
  const popularSeries: FlowSeries[] = (popular.data ?? [])
    .filter((m) => {
      const key = m.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 24)
    .map((m) => ({
      key: m.id,
      title: m.title,
      author: m.author,
      total_volumes: m.total_volumes,
      cover_url: m.cover_url,
      source: { source: "db", manga_id: m.id },
      owned: owned.filter((v) => v.manga_id === m.id).map((v) => v.volume_number),
      read: readings.filter((r) => r.manga_id === m.id && r.status === "read").map((r) => r.volume_number),
    }));

  return (
    <AppShell active={null} avatarInitials={profile?.avatar_initials ?? undefined} hideMobileAdd>
      <QuickAdd popular={popularSeries} welcome={Boolean(bienvenue)} name={profile?.username ?? null} />
    </AppShell>
  );
}
