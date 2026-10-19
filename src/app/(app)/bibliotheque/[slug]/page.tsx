import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/session";
import { getOwnedVolumes, getReadings, getSeriesMeta } from "@/lib/supabase/queries";
import { loadDiscoveryContext, readerLibrary, withReaderSeries } from "@/lib/supabase/discovery-data";
import { contentContext } from "@/lib/discovery/suggest";
import { similarSeries } from "@/lib/discovery/similar";
import { AppShell } from "@/components/app/app-shell";
import { SerieDetail, type ShelfPresence } from "@/components/bibliotheque/serie-detail";

export default async function SeriePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(slug)) notFound();

  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login");

  // Everything is keyed on the id in the URL : one round of queries, the
  // series itself included.
  const [{ data: manga, error: mangaError }, { data: wishes, error: wishesError }, { data: collection, error: collectionError }, { data: profile }, { data: catalogueVolumes }, allSeries, allVolumes, allReadings, discovery] =
    await Promise.all([
      // RLS : another reader's private series is simply not found.
      supabase
        .from("mangas")
        .select("id, title, author, publisher_fr, total_volumes, status, cover_url, genres, demographic, audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_year, synopsis, created_by, merged_into, pictures")
        .eq("id", slug)
        .maybeSingle(),
      supabase.from("wishlist_items").select("volume_number").eq("user_id", user.id).eq("manga_id", slug),
      supabase.from("user_collections").select("archived_at, liked").eq("user_id", user.id).eq("manga_id", slug).maybeSingle(),
      supabase.from("profiles").select("avatar_initials").eq("id", user.id).single(),
      // French-edition covers per volume (filled nightly) ; none is fine
      supabase.from("volumes").select("volume_number, cover_url").eq("manga_id", slug).not("cover_url", "is", null),
      // "Dans le même genre" : the same content rules as Découvrir
      getSeriesMeta(supabase, user.id, { includeArchived: true }),
      getOwnedVolumes(supabase, user.id),
      getReadings(supabase, user.id),
      loadDiscoveryContext(supabase, user.id),
    ]);

  if (mangaError) throw new Error("Impossible de charger cette série.");
  if (!manga) notFound();
  // An old link to a series merged into another one.
  if (manga.merged_into) redirect(`/bibliotheque/${manga.merged_into}`);
  if (wishesError) throw new Error("Impossible de charger les envies.");
  if (collectionError) throw new Error("Impossible de charger cette série.");

  // Already in volume order : this series' share of the full lists.
  const volumes = allVolumes.filter((v) => v.manga_id === manga.id);
  const readings = allReadings.filter((r) => r.manga_id === manga.id);

  const knownMap = withReaderSeries(discovery.catalogue, allSeries);
  const ctx = contentContext(readerLibrary(allSeries, allVolumes, allReadings), knownMap, discovery.declared, discovery.scope);
  const shelfIds = new Set(allSeries.filter((s) => !s.archived_at).map((s) => s.manga_id));
  const similar = similarSeries({ id: manga.id, title: manga.title, genres: manga.genres ?? [], demographic: manga.demographic }, discovery.catalogue, ctx).map((c) => ({
    id: c.id,
    title: c.title,
    cover_url: c.cover_url,
    onShelf: shelfIds.has(c.id),
  }));

  const presence: ShelfPresence = !collection ? "absent" : collection.archived_at ? "archived" : "on_shelf";

  return (
    <AppShell active="bibliotheque" avatarInitials={profile?.avatar_initials ?? undefined}>
      <SerieDetail
        manga={{
          id: manga.id,
          title: manga.title,
          author: manga.author,
          publisher_fr: manga.publisher_fr,
          total_volumes: manga.total_volumes,
          status: manga.status,
          cover_url: manga.cover_url,
          genres: manga.genres ?? [],
          demographic: manga.demographic,
          audience_min_age: manga.audience_min_age,
          audience_age_source: manga.audience_age_source,
          audience_age_scope: manga.audience_age_scope,
          audience_age_volumes: manga.audience_age_volumes,
          audience_age_year: manga.audience_age_year,
          synopsis: manga.synopsis,
          is_private: manga.created_by != null,
        }}
        presence={presence}
        volumes={volumes}
        readings={readings}
        wishedVolumes={(wishes ?? []).flatMap((w) => (w.volume_number == null ? [] : [w.volume_number]))}
        liked={collection?.liked ?? null}
        similar={similar}
        pictures={manga.pictures ?? []}
        volumeCovers={Object.fromEntries((catalogueVolumes ?? []).map((v) => [v.volume_number, v.cover_url as string]))}
      />
    </AppShell>
  );
}
