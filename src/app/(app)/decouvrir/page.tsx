import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedVolumes, getReadings, getSeriesMeta } from "@/lib/supabase/queries";
import { loadDiscoveryContext, readerLibrary, withReaderSeries } from "@/lib/supabase/discovery-data";
import { buildShelves, nextToRead, type Candidate } from "@/lib/collection/reading";
import { otherUniverses, suggest } from "@/lib/discovery/suggest";
import { TERRITORIES, type TerritoryKey } from "@/lib/discovery/territories";
import { AppShell } from "@/components/app/app-shell";
import { DiscoverView, type ContinueItem, type Selection } from "@/components/decouvrir/discover-view";

export const metadata: Metadata = { title: "Découvrir" };

// Why this volume, in words built from the reader's own data.
function continueReason(c: Candidate, lastRead: number | null): string {
  switch (c.kind) {
    case "reading":
      return "Tu l'as commencé.";
    case "next":
      return lastRead ? `Tu as lu jusqu'au tome ${lastRead}. Le suivant est chez toi.` : "Il est chez toi, pas encore lu.";
    case "gap":
      return `Il est chez toi. Le tome ${c.missing} manque.`;
    case "skipped":
      return "Il est chez toi, tu l'as laissé de côté.";
    case "to_find":
      return `Tu as lu jusqu'au tome ${lastRead ?? c.volume - 1}. Celui-ci n'est pas chez toi.`;
  }
}

export default async function DecouvrirPage({ searchParams }: { searchParams: Promise<{ territoire?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ territoire }, selectionsResult, series, volumes, readings, { data: profile }, discovery] = await Promise.all([
    searchParams,
    supabase
      .from("editorial_selections")
      .select("slug, title, description, position, editorial_selection_items ( manga_id, position, note )")
      .order("position"),
    getSeriesMeta(supabase, user.id, { includeArchived: true }),
    getOwnedVolumes(supabase, user.id),
    getReadings(supabase, user.id),
    supabase.from("profiles").select("avatar_initials").eq("id", user.id).single(),
    loadDiscoveryContext(supabase, user.id),
  ]);
  if (selectionsResult.error) throw new Error("Impossible de charger les découvertes.");

  const { catalogue, dismissed, wished, declared } = discovery;
  const byId = new Map(catalogue.map((c) => [c.id, c]));
  const known = [...withReaderSeries(catalogue, series).values()];

  // Taste comes from every series the reader has, archived ones included.
  const library = readerLibrary(series, volumes, readings);
  const onShelf = series.filter((s) => !s.archived_at).map((s) => s.manga_id);
  const excluded = new Set([...series.map((s) => s.manga_id), ...wished, ...dismissed]);

  const suggestions = suggest(library, known, excluded, { limit: 9, declared }).map((s) => ({ entry: s.entry, reason: s.reason }));
  const others = otherUniverses(library, known, new Set([...excluded, ...suggestions.map((s) => s.entry.id)]), { declared });

  // Continue a series / read a volume already at home : from the reader's shelf.
  const continueItems: ContinueItem[] = buildShelves(series.filter((s) => !s.archived_at), volumes, readings)
    .map((shelf) => ({ shelf, candidate: nextToRead(shelf) }))
    .filter((x): x is { shelf: (typeof x)["shelf"]; candidate: Candidate } => x.candidate != null)
    .sort((a, b) => Number(a.candidate.kind === "to_find") - Number(b.candidate.kind === "to_find") || (b.shelf.lastFinished ?? "").localeCompare(a.shelf.lastFinished ?? ""))
    .slice(0, 6)
    .map(({ shelf, candidate }) => ({
      manga_id: shelf.manga_id,
      title: shelf.title,
      cover_url: shelf.cover_url,
      volume: candidate.kind === "gap" ? candidate.available : candidate.volume,
      reason: continueReason(candidate, shelf.read.length ? Math.max(...shelf.read) : null),
      toFind: candidate.kind === "to_find",
    }));

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

  const initialTerritory = TERRITORIES.some((t) => t.key === territoire) ? (territoire as TerritoryKey) : null;

  return (
    <AppShell active="decouvrir" avatarInitials={profile?.avatar_initials ?? undefined}>
      <DiscoverView
        continueItems={continueItems}
        suggestions={suggestions}
        others={others}
        selections={selections}
        catalogue={catalogue}
        onShelf={onShelf}
        wished={wished}
        declared={declared}
        dismissedCount={dismissed.size}
        hasHistory={library.some((l) => l.read + l.owned > 0 || l.liked != null)}
        initialTerritory={initialTerritory}
      />
    </AppShell>
  );
}
