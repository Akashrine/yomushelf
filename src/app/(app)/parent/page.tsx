import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedVolumes, getReadings, getSeriesMeta } from "@/lib/supabase/queries";
import {
  buildMonthlyTimeline,
  formatEur,
  summarizeCollection,
  summarizeWishlist,
  todayIso,
  volumeKey,
} from "@/lib/collection/value";
import { readIndex } from "@/lib/collection/reading";
import { LibraryShell } from "@/components/bibliotheque/library-shell";
import { CollectionHero } from "@/components/collection/collection-hero";
import { StatTile } from "@/components/collection/stat-tile";
import { BookTowerChart } from "@/components/collection/book-tower-chart";
import { SleepingShelf, type SleepingSeries } from "@/components/collection/sleeping-shelf";
import { BulkReadForm } from "@/components/parent/bulk-read-form";

export const metadata: Metadata = { title: "Espace parent" };

// Parent space : amounts, budget and bulk corrections.
// A separate screen of the same account, not a protected area.
export default async function ParentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [volumes, readings, series, { data: profile }, { data: wishes }] = await Promise.all([
    getOwnedVolumes(supabase, user.id),
    getReadings(supabase, user.id),
    getSeriesMeta(supabase, user.id),
    supabase.from("profiles").select("username, avatar_initials").eq("id", user.id).single(),
    supabase.from("wishlist_items").select("target_price").eq("user_id", user.id),
  ]);

  const reads = readIndex(readings);
  const volumesRead = readings.filter((r) => r.status === "read").length;
  const summary = summarizeCollection(volumes, reads, volumesRead);
  const timeline = buildMonthlyTimeline(volumes, reads, todayIso());
  const wishlist = summarizeWishlist(
    (wishes ?? []).map((w) => ({ target_price: w.target_price == null ? null : Number(w.target_price) }))
  );

  const titles = new Map(series.map((s) => [s.manga_id, s]));
  const sleepingById = new Map<string, SleepingSeries>();
  for (const v of volumes) {
    if (v.acquisition_type !== "bought" || reads.has(volumeKey(v.manga_id, v.volume_number))) continue;
    const meta = titles.get(v.manga_id);
    const entry = sleepingById.get(v.manga_id) ?? {
      manga_id: v.manga_id,
      title: meta?.title ?? "Série",
      cover_url: meta?.cover_url ?? null,
      count: 0,
      valueEur: 0,
    };
    entry.count++;
    entry.valueEur += v.price_eur ?? 0;
    sleepingById.set(v.manga_id, entry);
  }
  const sleeping = [...sleepingById.values()].sort((a, b) => b.valueEur - a.valueEur);
  const name = profile?.username;

  return (
    <LibraryShell
      username={profile?.username ?? null}
      avatarInitials={profile?.avatar_initials ?? "?"}
      active="parent"
    >
      <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "#b9aefc" }}>
        Espace parent
      </p>
      <h1 className="mb-5 mt-1 text-2xl font-bold sm:text-3xl">
        {name ? `Collection de ${name}` : "La collection"}
      </h1>

      <div className="flex flex-col gap-4 sm:gap-5">
        <CollectionHero summary={summary} />

        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:gap-5">
          <StatTile
            label="Payé"
            value={formatEur(summary.paidEur)}
            detail={
              summary.costPerReadEur != null
                ? `Soit ${formatEur(summary.costPerReadEur)} par tome lu`
                : "Aucun tome lu pour l'instant"
            }
            icon="wallet"
            color="var(--read)"
          />
          <StatTile
            label="Achetés, pas encore lus"
            value={`${summary.sleepingCount} tome${summary.sleepingCount > 1 ? "s" : ""}`}
            detail={summary.sleepingEur > 0 ? `${formatEur(summary.sleepingEur)} de prix saisis` : "Aucun prix saisi pour ceux-là"}
            icon="moon"
            color="var(--sleep)"
          />
          <StatTile
            label="Envies"
            value={formatEur(wishlist.totalEur)}
            detail={`${wishlist.count} tome${wishlist.count > 1 ? "s" : ""}${wishlist.missingPriceCount ? `, dont ${wishlist.missingPriceCount} sans prix` : ""}`}
            icon="star"
            color="var(--gold)"
          />
          <StatTile
            label="Tomes lus"
            value={String(volumesRead)}
            detail={`${summary.volumesTotal} tome${summary.volumesTotal > 1 ? "s" : ""} à la maison`}
            icon="check"
            color="var(--read)"
          />
        </div>

        {(summary.missingPriceCount > 0 || timeline.undatedCount > 0) && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {summary.missingPriceCount > 0 &&
              `${summary.missingPriceCount} tome${summary.missingPriceCount > 1 ? "s" : ""} sans prix, non comptés dans les montants. `}
            {timeline.undatedCount > 0 &&
              `${timeline.undatedCount} tome${timeline.undatedCount > 1 ? "s" : ""} sans date d'arrivée, absents du graphique.`}
          </p>
        )}

        <BookTowerChart months={timeline.months} />
        <SleepingShelf series={sleeping} />

        <BulkReadForm series={series.map((s) => ({ manga_id: s.manga_id, title: s.title })).sort((a, b) => a.title.localeCompare(b.title, "fr"))} />
      </div>
    </LibraryShell>
  );
}
