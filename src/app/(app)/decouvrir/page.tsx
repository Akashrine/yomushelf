import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedVolumes, getReadings, getSeriesMeta } from "@/lib/supabase/queries";
import { suggest, type CatalogueEntry } from "@/lib/discovery/suggest";
import { AppShell } from "@/components/app/app-shell";
import { DiscoverView, type Selection } from "@/components/decouvrir/discover-view";

export const metadata: Metadata = { title: "Découvrir" };

const CATALOGUE_SELECT =
  "id, title, author, genres, demographic, audience_min_age, total_volumes, status, top_50_rank, cover_url";

export default async function DecouvrirPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [catalogueResult, selectionsResult, series, volumes, readings, wishesResult, { data: profile }] = await Promise.all([
    // Shared catalogue only : private series never appear in discovery.
    supabase.from("mangas").select(CATALOGUE_SELECT).is("created_by", null),
    supabase
      .from("editorial_selections")
      .select("slug, title, description, position, editorial_selection_items ( manga_id, position, note )")
      .order("position"),
    getSeriesMeta(supabase, user.id, { includeArchived: true }),
    getOwnedVolumes(supabase, user.id),
    getReadings(supabase, user.id),
    supabase.from("wishlist_items").select("manga_id").eq("user_id", user.id),
    supabase.from("profiles").select("avatar_initials").eq("id", user.id).single(),
  ]);
  if (catalogueResult.error || selectionsResult.error || wishesResult.error) {
    throw new Error("Impossible de charger les découvertes.");
  }

  const catalogue: CatalogueEntry[] = (catalogueResult.data ?? []).map((m) => ({ ...m, genres: m.genres ?? [] }));
  const byId = new Map(catalogue.map((c) => [c.id, c]));

  // Taste comes from every series the reader has, archived ones included.
  const library = series.map((s) => ({
    manga_id: s.manga_id,
    read: readings.filter((r) => r.manga_id === s.manga_id && r.status === "read").length,
    owned: volumes.filter((v) => v.manga_id === s.manga_id).length,
  }));
  const wished = [...new Set((wishesResult.data ?? []).map((w) => w.manga_id))];
  const onShelf = series.filter((s) => !s.archived_at).map((s) => s.manga_id);
  const excluded = new Set([...series.map((s) => s.manga_id), ...wished]);

  const suggestions = suggest(library, catalogue, excluded, { limit: 9 }).map((s) => ({ entry: s.entry, reason: s.reason }));

  const selections: Selection[] = (selectionsResult.data ?? [])
    .map((s) => ({
      slug: s.slug,
      title: s.title,
      description: s.description,
      items: [...(s.editorial_selection_items ?? [])]
        .sort((a, b) => a.position - b.position)
        .flatMap((i) => {
          const entry = byId.get(i.manga_id);
          return entry ? [{ entry, note: i.note }] : [];
        }),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <AppShell active="decouvrir" avatarInitials={profile?.avatar_initials ?? undefined}>
      <DiscoverView
        suggestions={suggestions}
        selections={selections}
        catalogue={catalogue}
        onShelf={onShelf}
        wished={wished}
        hasLibrary={series.length > 0}
      />
    </AppShell>
  );
}
