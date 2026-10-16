import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedVolumes } from "@/lib/supabase/queries";
import { lastKnownPrice, nextVolumeToBuy, todayIso } from "@/lib/collection/value";
import { spendingOverview } from "@/lib/univers/stats";
import { AppShell } from "@/components/app/app-shell";
import { WishlistView, type WishItem, type WishSeries } from "@/components/envies/wishlist-view";

export const metadata: Metadata = { title: "Mes envies" };

export default async function EnviesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: wishes, error: wishesError }, { data: collections, error: collectionError }, volumes] = await Promise.all([
    supabase.from("profiles").select("username, avatar_initials").eq("id", user.id).single(),
    supabase
      .from("wishlist_items")
      .select("id, manga_id, volume_number, target_price, priority, mangas ( title, cover_url )")
      .eq("user_id", user.id),
    supabase
      .from("user_collections")
      .select("manga_id, mangas ( title, cover_url )")
      .eq("user_id", user.id)
      .is("archived_at", null),
    getOwnedVolumes(supabase, user.id),
  ]);
  if (wishesError || collectionError) throw new Error("Impossible de charger les envies.");

  // Estimates come from prices the reader really paid, never from a
  // default : last price paid for the series, else their average price.
  const average = spendingOverview(volumes, todayIso()).averagePaid;
  type MangaBits = { title: string; cover_url: string | null } | null;
  const toSeries = (manga_id: string, m: MangaBits): WishSeries => {
    const own = volumes.filter((v) => v.manga_id === manga_id);
    const seriesPaid = lastKnownPrice(own.filter((v) => v.acquisition_type === "bought"));
    return {
      manga_id,
      title: m?.title ?? "Série",
      cover_url: m?.cover_url ?? null,
      nextVolume: nextVolumeToBuy(own),
      lastPrice: lastKnownPrice(own),
      estimate: seriesPaid ?? average,
      estimateBasis: seriesPaid != null ? "series" : average != null ? "average" : null,
    };
  };
  // Shelf series (for the add form) plus series only wished (from Découvrir).
  const byId = new Map<string, WishSeries>();
  for (const c of collections ?? []) byId.set(c.manga_id, toSeries(c.manga_id, c.mangas as unknown as MangaBits));
  for (const w of wishes ?? []) if (!byId.has(w.manga_id)) byId.set(w.manga_id, toSeries(w.manga_id, w.mangas as unknown as MangaBits));
  const series = [...byId.values()].sort((a, b) => a.title.localeCompare(b.title, "fr"));

  const items: WishItem[] = (wishes ?? []).map((w) => ({
    id: w.id,
    manga_id: w.manga_id,
    volume_number: w.volume_number,
    target_price: w.target_price == null ? null : Number(w.target_price),
    priority: w.priority,
  }));

  return (
    <AppShell active="bibliotheque" avatarInitials={profile?.avatar_initials ?? undefined}>
      <h1 className="text-2xl font-bold sm:text-3xl">Mes envies</h1>
      <p className="mb-5 mt-1 text-sm" style={{ color: "var(--muted)" }}>
        Les tomes que tu aimerais avoir. Un prix « ≈ » est une estimation tirée de ce que tu as payé : ce n&apos;est pas une dépense.
      </p>
      <WishlistView items={items} series={series} />
    </AppShell>
  );
}
