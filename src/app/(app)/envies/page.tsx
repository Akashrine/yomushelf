import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/session";
import { getOwnedVolumes } from "@/lib/supabase/queries";
import { lastKnownPrice, nextVolumeToBuy, todayIso } from "@/lib/collection/value";
import { spendingOverview } from "@/lib/univers/stats";
import { priceIndex } from "@/lib/univers/prices";
import { loadPriceRows } from "@/lib/supabase/price-data";
import { AppShell } from "@/components/app/app-shell";
import { WishlistView, type WishItem, type WishSeries } from "@/components/envies/wishlist-view";
import { FamilySharePanel, type FamilyShareStatus } from "@/components/envies/family-share-panel";
import { frenchDate, maskEmail } from "@/lib/account/gate";
import { serviceClient } from "@/lib/server/consent";
import { isActiveShare } from "@/lib/wishlist/share";

export const metadata: Metadata = { title: "Mes envies" };

export default async function EnviesPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: wishes, error: wishesError }, { data: collections, error: collectionError }, volumes, { data: share }] = await Promise.all([
    supabase.from("profiles").select("username, avatar_initials, age_band").eq("id", user.id).single(),
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
    // Status only : the reader never reads the token nor what was offered.
    supabase.from("wishlist_shares").select("expires_at, revoked_at").eq("user_id", user.id).maybeSingle(),
  ]);
  if (wishesError || collectionError) throw new Error("Impossible de charger les envies.");

  // Estimates are never a made-up default : last price paid for the
  // series, else the publisher price, else the reader's average price.
  const average = spendingOverview(volumes, todayIso()).averagePaid;
  const priceOf = priceIndex(await loadPriceRows(supabase, [...(collections ?? []).map((c) => c.manga_id), ...(wishes ?? []).map((w) => w.manga_id)]));
  type MangaBits = { title: string; cover_url: string | null } | null;
  const toSeries = (manga_id: string, m: MangaBits): WishSeries => {
    const own = volumes.filter((v) => v.manga_id === manga_id);
    const seriesPaid = lastKnownPrice(own.filter((v) => v.acquisition_type === "bought"));
    const list = priceOf(manga_id)?.amount ?? null;
    return {
      manga_id,
      title: m?.title ?? "Série",
      cover_url: m?.cover_url ?? null,
      nextVolume: nextVolumeToBuy(own),
      lastPrice: lastKnownPrice(own),
      // What was paid for this series, else the publisher price, else the reader's average.
      estimate: seriesPaid ?? list ?? average,
      estimateBasis: seriesPaid != null ? "series" : list != null ? "publisher" : average != null ? "average" : null,
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

  // An active link stays manageable even once the list is empty.
  const familyShare = items.length > 0 || isActiveShare(share) ? await familyShareStatus(user.id, profile, share, items.length > 0) : null;

  return (
    <AppShell active="bibliotheque" avatarInitials={profile?.avatar_initials ?? undefined}>
      <h1 className="flex items-center gap-3 text-4xl sm:text-5xl" style={{ color: "var(--ink)" }}>
        <span
          aria-hidden="true"
          className="manga-sticker inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl leading-none"
          style={{ background: "var(--pop)", color: "var(--ink)", transform: "rotate(-6deg)" }}
        >
          ★
        </span>
        Mes envies
      </h1>
      <p className="mb-6 mt-3 max-w-prose text-sm" style={{ color: "var(--muted)" }}>
        Les tomes que tu aimerais avoir. Un prix « ≈ » est une estimation tirée de ce que tu as payé : ce n&apos;est pas une dépense.
      </p>
      {familyShare && <FamilySharePanel status={familyShare} />}
      <WishlistView items={items} series={series} />
    </AppShell>
  );
}

// Under 15 the parent shares : the panel says whether the email went out.
async function familyShareStatus(
  userId: string,
  profile: { username: string | null; age_band: string | null } | null,
  share: { expires_at: string; revoked_at: string | null } | null,
  hasWishes: boolean
): Promise<FamilyShareStatus | null> {
  const activeUntil = isActiveShare(share) && share ? frenchDate(new Date(share.expires_at)) : null;
  if (profile?.age_band === "15_plus") {
    return { kind: "reader", activeUntil, defaultName: profile.username ?? "", canCreate: hasWishes };
  }
  if (profile?.age_band !== "under_15") return null;
  if (activeUntil) return { kind: "child", activeUntil, askedOn: null, parentEmail: null };
  const service = serviceClient();
  const [{ data: link }, { data: consent }] = await Promise.all([
    service.from("wishlist_parent_links").select("created_at, expires_at").eq("user_id", userId).maybeSingle(),
    service.from("parental_consents").select("parent_email").eq("user_id", userId).maybeSingle(),
  ]);
  const asked = link && new Date(link.expires_at).getTime() > Date.now();
  return {
    kind: "child",
    activeUntil: null,
    askedOn: asked ? frenchDate(new Date(link.created_at)) : null,
    parentEmail: consent ? maskEmail(consent.parent_email) : null,
  };
}
