import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/session";
import { getOwnedVolumes, getReadings, getSeriesMeta } from "@/lib/supabase/queries";
import { loadDiscoveryContext, readerLibrary, withReaderSeries } from "@/lib/supabase/discovery-data";
import { GENRE_LABELS, GENRES, contentAllowed, contentContext, otherUniverses, suggest } from "@/lib/discovery/suggest";
import { buildDeck } from "@/lib/discovery/deck";
import { AppShell } from "@/components/app/app-shell";
import { DiscoverView, type DiscoverRow, type Selection } from "@/components/decouvrir/discover-view";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const metadata: Metadata = { title: "Découvrir" };

export default async function DecouvrirPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login");

  const [selectionsResult, series, volumes, readings, { data: profile }, discovery] = await Promise.all([
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

  const { catalogue, dismissed, wished, declared, scope } = discovery;
  const byId = new Map(catalogue.map((c) => [c.id, c]));
  const knownMap = withReaderSeries(catalogue, series);
  const known = [...knownMap.values()];

  // Taste comes from every series the reader has, archived ones included.
  const library = readerLibrary(series, volumes, readings);
  const ctx = contentContext(library, knownMap, declared, scope);
  const onShelf = series.filter((s) => !s.archived_at).map((s) => s.manga_id);
  const excluded = new Set([...series.map((s) => s.manga_id), ...wished, ...dismissed]);

  const suggestions = suggest(library, known, excluded, { limit: 9, declared, scope }).map((s) => ({ entry: s.entry, reason: s.reason }));
  const others = otherUniverses(library, known, new Set([...excluded, ...suggestions.map((s) => s.entry.id)]), { declared, scope });
  // The swipe deck : more personal suggestions, then other universes, then
  // the most read series this reader may be proposed.
  const deck = buildDeck(
    [...suggest(library, known, excluded, { limit: 30, declared, scope }), ...others],
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
  // editorial selections, the most read, and one row per genre. Same
  // content rules everywhere.
  const allowed = catalogue.filter((c) => contentAllowed(c, ctx));
  const byRank = [...allowed].sort((a, b) => (a.top_50_rank ?? 999) - (b.top_50_rank ?? 999) || a.title.localeCompare(b.title, "fr"));
  const liked = new Set(declared.liked);
  const genreRows: DiscoverRow[] = GENRES.filter((g) => !declared.avoided.includes(g))
    .map((g) => ({ key: `genre-${g}`, title: cap(GENRE_LABELS[g]), items: byRank.filter((c) => c.genres.includes(g)).slice(0, 15).map((entry) => ({ entry })) }))
    .filter((r) => r.items.length >= 4)
    .sort((a, b) => Number(liked.has(b.key.slice(6))) - Number(liked.has(a.key.slice(6))) || b.items.length - a.items.length)
    .slice(0, 6);
  const rows: DiscoverRow[] = [
    { key: "pour-toi", title: "Pour toi", subtitle: suggestions.length ? "D'après ta collection et tes goûts." : null, items: suggestions },
    ...selections.map((s) => ({ key: s.slug, title: s.title, subtitle: s.description, items: s.items })),
    { key: "plus-lus", title: "Les plus lus en France", items: byRank.filter((c) => c.top_50_rank != null).slice(0, 15).map((entry) => ({ entry })) },
    { key: "autre", title: "Un univers différent", subtitle: "Pour sortir de tes habitudes.", items: others },
    ...genreRows,
  ];

  const featuredCard = suggestions[0] ?? (deck[0] ? { entry: deck[0].entry, reason: deck[0].reason } : null);
  const { data: featuredMeta } = featuredCard
    ? await supabase.from("mangas").select("synopsis").eq("id", featuredCard.entry.id).maybeSingle()
    : { data: null };

  return (
    <AppShell active="decouvrir" avatarInitials={profile?.avatar_initials ?? undefined}>
      <DiscoverView
        featured={featuredCard ? { card: featuredCard, synopsis: featuredMeta?.synopsis ?? null } : null}
        deck={deck}
        rows={rows}
        catalogue={allowed}
        onShelf={onShelf}
        wished={wished}
        declared={declared}
        scope={scope}
        dismissedCount={dismissed.size}
        hasHistory={library.some((l) => l.read + l.owned > 0 || l.liked != null)}
      />
    </AppShell>
  );
}
