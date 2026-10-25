import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/session";
import { getOwnedVolumes, getReadings } from "@/lib/supabase/queries";
import { AppShell } from "@/components/app/app-shell";
import { AddFlow, type FlowSeries } from "@/components/ajouter/add-flow";
import { QuickAdd } from "@/components/ajouter/quick-add";
import { minorMayAdd } from "@/lib/discovery/minor-catalogue";
import { mayHaveSeries } from "@/lib/server/youth-selection";

export const metadata: Metadata = { title: "Ajouter un manga" };

export default async function AjouterPage({
  searchParams,
}: {
  searchParams: Promise<{ serie?: string; detaille?: string; bienvenue?: string }>;
}) {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login");

  const { serie, detaille, bienvenue } = await searchParams;
  const serieId = serie && /^[0-9a-f-]{36}$/i.test(serie) ? serie : null;

  // The quick add's covers, with the reader's volumes on each.
  const loadQuick = () =>
    Promise.all([
      supabase
        .from("mangas")
        .select("id, title, author, total_volumes, cover_url, audience_min_age, audience_age_source, audience_age_scope")
        .is("created_by", null)
        .is("merged_into", null)
        .eq("curated", true)
        .not("cover_url", "is", null)
        .order("top_50_rank", { ascending: true, nullsFirst: false })
        .order("title")
        .limit(120), // a reader under 15 keeps only the verified ages : room to fill the grid
      getOwnedVolumes(supabase, user.id),
      getReadings(supabase, user.id),
    ]);

  // One round of queries : the profile, then either the series asked for
  // (keyed on the id in the URL) or the quick add.
  const [{ data: profile }, serieResult, quickResult] = await Promise.all([
    supabase.from("profiles").select("avatar_initials, username, age_band").eq("id", user.id).single(),
    serieId
      ? Promise.all([
          supabase.from("mangas").select("id, title, author, total_volumes, cover_url").eq("id", serieId).maybeSingle(),
          getOwnedVolumes(supabase, user.id, serieId),
          getReadings(supabase, user.id, serieId),
        ])
      : null,
    !serieId && !detaille ? loadQuick() : null,
  ]);

  // "Ajouter des tomes" from a series page opens the flow on that series.
  let initial: FlowSeries | null = null;
  if (serieResult) {
    const [{ data: manga, error }, volumes, readings] = serieResult;
    if (error) throw new Error("Impossible de charger cette série.");
    // A series the youth selection does not allow is not opened from a link either.
    const allowed = manga && (profile?.age_band === "15_plus" || (await mayHaveSeries(supabase, user.id, manga.id)) === true);
    if (manga && allowed) {
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

  // An unknown series in the URL falls back to the quick add.
  const [popular, owned, readings] = quickResult ?? (await loadQuick());
  if (popular.error) throw new Error("Impossible de charger les séries populaires.");
  // One card per title : the catalogue still holds a few duplicates.
  const seen = new Set<string>();
  const minor = profile?.age_band !== "15_plus"; // under 15, or not said yet
  const popularSeries: FlowSeries[] = (popular.data ?? [])
    // Under 15 : the youth selection, plus what is already on their shelf.
    .filter((m) => !minor || minorMayAdd(m) || owned.some((v) => v.manga_id === m.id))
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
