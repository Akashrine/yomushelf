import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedVolumes } from "@/lib/supabase/queries";
import { summarizeSeries } from "@/lib/collection/value";
import { LibraryShell } from "@/components/bibliotheque/library-shell";
import { WishlistView, type WishItem, type WishSeries } from "@/components/envies/wishlist-view";

export const metadata: Metadata = { title: "Mes envies" };

export default async function EnviesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: wishes }, { data: collections }, volumes] = await Promise.all([
    supabase.from("profiles").select("username, avatar_initials").eq("id", user.id).single(),
    supabase
      .from("wishlist_items")
      .select("id, manga_id, volume_number, target_price, priority")
      .eq("user_id", user.id),
    supabase
      .from("user_collections")
      .select("manga_id, mangas ( title, cover_url )")
      .eq("user_id", user.id),
    getOwnedVolumes(supabase, user.id),
  ]);

  const series: WishSeries[] = (collections ?? [])
    .map((c) => {
      const m = c.mangas as unknown as { title: string; cover_url: string | null } | null;
      const s = summarizeSeries(volumes.filter((v) => v.manga_id === c.manga_id));
      return {
        manga_id: c.manga_id,
        title: m?.title ?? "Série",
        cover_url: m?.cover_url ?? null,
        nextVolume: s.nextVolumeNumber,
        lastPrice: s.lastPriceEur,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, "fr"));

  const items: WishItem[] = (wishes ?? []).map((w) => ({
    ...w,
    target_price: w.target_price == null ? null : Number(w.target_price),
  }));

  return (
    <LibraryShell
      username={profile?.username ?? null}
      avatarInitials={profile?.avatar_initials ?? "?"}
      active="envies"
    >
      <h1 className="mb-5 text-2xl font-bold sm:text-3xl">Mes envies</h1>
      <WishlistView items={items} series={series} />
    </LibraryShell>
  );
}
