import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedVolumes, getReadings, getSeriesMeta } from "@/lib/supabase/queries";
import { buildShelves } from "@/lib/collection/reading";
import { AppShell } from "@/components/app/app-shell";
import { LibraryHome, type ArchivedSeries, type ShelfCard, type WishPreview } from "@/components/bibliotheque/library-home";

export const metadata: Metadata = { title: "Ma bibliothèque" };

// Home of the app : what to read now, the series, the wishes.
// Everything comes from the server render ; actions refresh it.
export default async function BibliothequePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [series, volumes, readings, { data: profile }, wishesResult] = await Promise.all([
    getSeriesMeta(supabase, user.id, { includeArchived: true }),
    getOwnedVolumes(supabase, user.id),
    getReadings(supabase, user.id),
    supabase.from("profiles").select("username, avatar_initials").eq("id", user.id).single(),
    supabase.from("wishlist_items").select("manga_id, volume_number, created_at, mangas ( title )").eq("user_id", user.id).order("created_at"),
  ]);
  if (wishesResult.error) throw new Error("Impossible de charger tes envies.");
  const wishes = wishesResult.data ?? [];

  const active = series.filter((s) => !s.archived_at);
  const archivedMeta = series.filter((s) => s.archived_at);
  const shelves = buildShelves(active, volumes, readings);
  const meta = new Map(series.map((s) => [s.manga_id, s]));

  // Most recently active first : reading now, then last finished, then newest.
  const cards: ShelfCard[] = shelves
    .map((shelf) => ({
      shelf,
      totalVolumes: meta.get(shelf.manga_id)?.total_volumes ?? null,
      wished: wishes.filter((w) => w.manga_id === shelf.manga_id && w.volume_number != null).map((w) => w.volume_number as number),
      isPrivate: meta.get(shelf.manga_id)?.is_private ?? false,
    }))
    .sort((a, b) => {
      const ra = a.shelf.reading.length ? 1 : 0;
      const rb = b.shelf.reading.length ? 1 : 0;
      return (
        rb - ra ||
        (b.shelf.lastFinished ?? "").localeCompare(a.shelf.lastFinished ?? "") ||
        (meta.get(b.shelf.manga_id)?.first_added_at ?? "").localeCompare(meta.get(a.shelf.manga_id)?.first_added_at ?? "") ||
        a.shelf.title.localeCompare(b.shelf.title, "fr")
      );
    });

  const archived: ArchivedSeries[] = buildShelves(archivedMeta, volumes, readings).map((s) => ({
    manga_id: s.manga_id,
    title: s.title,
    read: s.read.length,
    owned: s.owned.length,
  }));

  const wishPreview: WishPreview[] = wishes.slice(0, 6).map((w) => ({
    manga_id: w.manga_id,
    title: (w.mangas as unknown as { title: string } | null)?.title ?? meta.get(w.manga_id)?.title ?? "Série",
    volume_number: w.volume_number,
  }));

  return (
    <AppShell active="bibliotheque" avatarInitials={profile?.avatar_initials ?? undefined}>
      <LibraryHome
        name={profile?.username ?? null}
        cards={cards}
        archived={archived}
        wishes={wishPreview}
        wishCount={wishes.length}
      />
    </AppShell>
  );
}
