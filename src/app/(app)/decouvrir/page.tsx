import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/session";
import { getOwnedVolumes, getReadings, getSeriesMeta } from "@/lib/supabase/queries";
import { loadDiscoveryContext, loadNeighbours, readerLibrary, withReaderSeries } from "@/lib/supabase/discovery-data";
import { contentAllowed, contentContext, otherUniverses, suggest } from "@/lib/discovery/suggest";
import { buildDeck } from "@/lib/discovery/deck";
import { territoryRows, toRef, type RowDraft } from "@/lib/discovery/rows";
import { todayIso } from "@/lib/collection/value";
import { AppShell } from "@/components/app/app-shell";
import { DiscoverView, type Selection } from "@/components/decouvrir/discover-view";

export const metadata: Metadata = { title: "Découvrir" };

export default async function DecouvrirPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login");

  const [selectionsResult, series, volumes, readings, { data: profile }, discovery, { data: synopses }] = await Promise.all([
    supabase
      .from("editorial_selections")
      .select("slug, title, description, position, editorial_selection_items ( manga_id, position, note )")
      .order("position"),
    getSeriesMeta(supabase, user.id, { includeArchived: true }),
    getOwnedVolumes(supabase, user.id),
    getReadings(supabase, user.id),
    supabase.from("profiles").select("avatar_initials").eq("id", user.id).single(),
    loadDiscoveryContext(supabase, user.id),
    // The featured card's synopsis, known only once suggestions are
    // computed : every curated synopsis now (~10 KB, server side only)
    // rather than a second round trip.
    supabase.from("mangas").select("id, synopsis").is("created_by", null).is("merged_into", null).eq("curated", true).not("synopsis", "is", null),
  ]);
  if (selectionsResult.error) throw new Error("Impossible de charger les découvertes.");

  const { catalogue, dismissed, wished, declared, scope, scopeLocked } = discovery;
  const byId = new Map(catalogue.map((c) => [c.id, c]));
  const knownMap = withReaderSeries(catalogue, series);
  const known = [...knownMap.values()];

  // Taste comes from every series the reader has, archived ones included.
  const library = readerLibrary(series, volumes, readings);
  const ctx = contentContext(library, knownMap, declared, scope);
  const onShelf = series.filter((s) => !s.archived_at).map((s) => s.manga_id);
  const excluded = new Set([...series.map((s) => s.manga_id), ...wished, ...dismissed]);
  // Series close to the reader's own (one small query, their ids only).
  const neighbours = await loadNeighbours(supabase, series.map((s) => s.manga_id));

  const suggestions = suggest(library, known, excluded, { limit: 9, declared, scope, neighbours }).map((s) => ({ entry: s.entry, reason: s.reason }));
  const others = otherUniverses(library, known, new Set([...excluded, ...suggestions.map((s) => s.entry.id)]), { declared, scope });
  // The swipe deck : more personal suggestions, then other universes, then
  // the most read series this reader may be proposed.
  const deck = buildDeck(
    [...suggest(library, known, excluded, { limit: 30, declared, scope, neighbours }), ...others],
    catalogue,
    excluded,
    ctx
  );

  const selections: Selection[] = (selectionsResult.data ?? [])
    .map((s) => ({
      slug: s.slug,
      title: s.title,
      description: s.description,
      items: [...(s.editorial_selection_items ?? [])]
        .sort((a, b) => a.position - b.position)
        // Selections are proposals too : same content rules as suggestions.
        .flatMap((i) => {
          const entry = byId.get(i.manga_id);
          return entry && contentAllowed(entry, ctx) ? [{ entry, note: i.note }] : [];
        }),
    }))
    .filter((s) => s.items.length > 0);

  // Rows of covers, like a streaming home : personal first, then the
  // editorial selections, the most read, and one row per genre family.
  // Same content rules everywhere. The view composes them (after its age
  // filter) : nothing the reader already has, each series once on the
  // page (lib/discovery/rows.ts).
  const allowed = catalogue.filter((c) => contentAllowed(c, ctx));
  const byRank = [...allowed].sort((a, b) => (a.top_50_rank ?? 999) - (b.top_50_rank ?? 999) || a.title.localeCompare(b.title, "fr"));
  const drafts: RowDraft[] = [
    { key: "pour-toi", title: "Pour toi", subtitle: suggestions.length ? "D'après ta collection et tes goûts." : null, items: suggestions, priority: 0, min: 3 },
    ...selections.map((s, i) => ({ key: s.slug, title: s.title, subtitle: s.description, items: s.items, priority: 20 + i, min: 3 })),
    { key: "plus-lus", title: "Les plus lus en France", items: byRank.filter((c) => c.top_50_rank != null).map((entry) => ({ entry })), priority: 40 },
    { key: "autre", title: "Un univers différent", subtitle: "Pour sortir de tes habitudes.", items: others, priority: 10, min: 3 },
    ...territoryRows(allowed, `${todayIso()}:${user.id}`, declared),
  ];

  const featuredCard = suggestions[0] ?? (deck[0] ? { entry: deck[0].entry, reason: deck[0].reason } : null);
  const featuredSynopsis = featuredCard ? (synopses ?? []).find((m) => m.id === featuredCard.entry.id)?.synopsis ?? null : null;

  return (
    <AppShell active="decouvrir" avatarInitials={profile?.avatar_initials ?? undefined}>
      <DiscoverView
        featured={featuredCard ? { card: featuredCard, synopsis: featuredSynopsis } : null}
        deck={deck}
        rowDrafts={drafts.map(toRef)}
        excluded={[...excluded]}
        shelfTitles={series.map((s) => s.title)}
        catalogue={allowed}
        onShelf={onShelf}
        wished={wished}
        declared={declared}
        scope={scope}
        scopeLocked={scopeLocked}
        dismissedCount={dismissed.size}
        hasHistory={library.some((l) => l.read + l.owned > 0 || l.liked != null)}
      />
    </AppShell>
  );
}
