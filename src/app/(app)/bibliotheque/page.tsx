import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/session";
import { getOwnedVolumes, getReadings, getSeriesMeta } from "@/lib/supabase/queries";
import { buildShelves } from "@/lib/collection/reading";
import { waitingAtHome } from "@/lib/univers/stats";
import { AppShell } from "@/components/app/app-shell";
import { LibraryHome, type ArchivedSeries, type ShelfCard, type WishPreview } from "@/components/bibliotheque/library-home";

export const metadata: Metadata = { title: "Ma collection" };

// Home of the app : the collection as a wall of covers, then the wishes,
// what waits to be read, and the tool for readings from before Yomushelf.
// Everything comes from the server render ; actions refresh it.
export default async function BibliothequePage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login");

  const [series, volumes, readings, { data: profile }, wishesResult] = await Promise.all([
    getSeriesMeta(supabase, user.id, { includeArchived: true }),
    getOwnedVolumes(supabase, user.id),
    getReadings(supabase, user.id),
    supabase.from("profiles").select("username, avatar_initials").eq("id", user.id).single(),
    supabase.from("wishlist_items").select("manga_id, volume_number, created_at, mangas ( title, cover_url )").eq("user_id", user.id).order("created_at"),
  ]);
  if (wishesResult.error) throw new Error("Impossible de charger tes envies.");
  const wishes = wishesResult.data ?? [];

  // A brand-new library starts with the quick add (onboarding) : covers to
  // tap rather than an empty page.
  if (series.length === 0) redirect("/ajouter?bienvenue=1");

  const active = series.filter((s) => !s.archived_at);
  const archivedMeta = series.filter((s) => s.archived_at);
  const shelves = buildShelves(active, volumes, readings);
  const meta = new Map(series.map((s) => [s.manga_id, s]));

  // Most recently active first : reading now, then last finished, then newest.
  const cards: ShelfCard[] = shelves
    .map((shelf) => ({
      shelf,
      totalVolumes: meta.get(shelf.manga_id)?.total_volumes ?? null,
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

  const wishPreview: WishPreview[] = wishes.slice(0, 12).map((w) => {
    const m = w.mangas as unknown as { title: string; cover_url: string | null } | null;
    return {
      manga_id: w.manga_id,
      title: m?.title ?? meta.get(w.manga_id)?.title ?? "Série",
      cover_url: m?.cover_url ?? null,
      volume_number: w.volume_number,
    };
  });

  return (
    <AppShell active="bibliotheque" avatarInitials={profile?.avatar_initials ?? undefined}>
      <LibraryHome
        name={profile?.username ?? null}
        cards={cards}
        archived={archived}
        wishes={wishPreview}
        wishCount={wishes.length}
        waiting={waitingAtHome(shelves)}
        pastReadSeries={active.map((s) => ({ manga_id: s.manga_id, title: s.title })).sort((a, b) => a.title.localeCompare(b.title, "fr"))}
      />
    </AppShell>
  );
}
