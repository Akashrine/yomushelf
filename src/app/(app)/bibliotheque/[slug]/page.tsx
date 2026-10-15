import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedVolumes, getReadings } from "@/lib/supabase/queries";
import { AppShell } from "@/components/app/app-shell";
import { SerieDetail, type ShelfPresence } from "@/components/bibliotheque/serie-detail";

export default async function SeriePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(slug)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS : another reader's private series is simply not found.
  const { data: manga, error: mangaError } = await supabase
    .from("mangas")
    .select("id, title, author, publisher_fr, total_volumes, status, cover_url, genres, demographic, audience_min_age, audience_age_source, synopsis, created_by, merged_into")
    .eq("id", slug)
    .maybeSingle();

  if (mangaError) throw new Error("Impossible de charger cette série.");
  if (!manga) notFound();
  // An old link to a series merged into another one.
  if (manga.merged_into) redirect(`/bibliotheque/${manga.merged_into}`);

  const [volumes, readings, { data: wishes, error: wishesError }, { data: collection, error: collectionError }, { data: profile }] =
    await Promise.all([
      getOwnedVolumes(supabase, user.id, manga.id),
      getReadings(supabase, user.id, manga.id),
      supabase.from("wishlist_items").select("volume_number").eq("user_id", user.id).eq("manga_id", manga.id),
      supabase.from("user_collections").select("archived_at, liked").eq("user_id", user.id).eq("manga_id", manga.id).maybeSingle(),
      supabase.from("profiles").select("avatar_initials").eq("id", user.id).single(),
    ]);
  if (wishesError) throw new Error("Impossible de charger les envies.");
  if (collectionError) throw new Error("Impossible de charger cette série.");

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
          synopsis: manga.synopsis,
          is_private: manga.created_by != null,
        }}
        presence={presence}
        volumes={volumes}
        readings={readings}
        wishedVolumes={(wishes ?? []).flatMap((w) => (w.volume_number == null ? [] : [w.volume_number]))}
        liked={collection?.liked ?? null}
      />
    </AppShell>
  );
}
