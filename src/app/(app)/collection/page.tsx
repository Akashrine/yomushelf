import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedVolumes } from "@/lib/supabase/queries";
import {
  buildMonthlyTimeline,
  formatEur,
  summarizeCollection,
  todayIso,
} from "@/lib/collection/value";
import { LibraryShell } from "@/components/bibliotheque/library-shell";
import { AppIcon } from "@/components/app/app-icon";
import { CollectionHero } from "@/components/collection/collection-hero";
import { ReadProgressCard } from "@/components/collection/read-progress-card";
import { StatTile } from "@/components/collection/stat-tile";
import { BookTowerChart } from "@/components/collection/book-tower-chart";
import { SleepingShelf, type SleepingSeries } from "@/components/collection/sleeping-shelf";

export const metadata: Metadata = { title: "Ma collection" };

export default async function CollectionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [volumes, { data: profile }, { data: series }] = await Promise.all([
    getOwnedVolumes(supabase, user.id),
    supabase.from("profiles").select("username, avatar_initials").eq("id", user.id).single(),
    supabase
      .from("user_collections")
      .select("manga_id, mangas ( title, cover_url )")
      .eq("user_id", user.id),
  ]);

  const summary = summarizeCollection(volumes);
  const months = buildMonthlyTimeline(volumes, todayIso());

  const titles = new Map(
    (series ?? []).map((s) => {
      const m = s.mangas as unknown as { title: string; cover_url: string | null } | null;
      return [s.manga_id, { title: m?.title ?? "Série", cover_url: m?.cover_url ?? null }];
    })
  );

  const sleepingById = new Map<string, SleepingSeries>();
  for (const v of volumes) {
    if (v.acquisition_type !== "bought" || v.read_status === "read") continue;
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
      active="collection"
    >
      <h1 className="mb-5 text-2xl font-bold sm:text-3xl">
        {name ? `Salut ${name} !` : "Salut !"}
      </h1>

      {summary.volumesTotal === 0 ? (
        <EmptyCollection hasSeries={(series ?? []).length > 0} />
      ) : (
        <div className="flex flex-col gap-4 sm:gap-5">
          <div className="grid gap-4 sm:gap-5 md:grid-cols-5">
            <div className="rise-in md:col-span-3">
              <CollectionHero summary={summary} />
            </div>
            <div className="rise-in md:col-span-2" style={{ animationDelay: "120ms" }}>
              <ReadProgressCard read={summary.volumesRead} total={summary.volumesTotal} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:gap-5">
            <div className="rise-in" style={{ animationDelay: "200ms" }}>
              <StatTile
                label="J'ai payé"
                value={formatEur(summary.paidEur)}
                detail={
                  summary.costPerReadEur != null
                    ? `Soit ${formatEur(summary.costPerReadEur)} par tome lu`
                    : "Lis un tome pour voir ce qu'il t'a coûté"
                }
                icon="wallet"
                color="var(--read)"
              />
            </div>
            <div className="rise-in" style={{ animationDelay: "280ms" }}>
              <StatTile
                label="Attendent d'être lus"
                value={formatEur(summary.sleepingEur)}
                detail={
                  summary.sleepingCount === 0
                    ? "Rien ne dort. Tout est lu !"
                    : `${summary.sleepingCount} tome${summary.sleepingCount > 1 ? "s" : ""} acheté${summary.sleepingCount > 1 ? "s" : ""}, pas encore lu${summary.sleepingCount > 1 ? "s" : ""}`
                }
                icon="moon"
                color="var(--sleep)"
                sleeping={summary.sleepingCount > 0}
              />
            </div>
          </div>

          {summary.missingPriceCount > 0 && (
            <Link
              href="/bibliotheque"
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-opacity hover:opacity-90"
              style={{ background: "rgba(248,192,74,0.08)", border: "1px dashed rgba(248,192,74,0.4)" }}
            >
              <span style={{ color: "var(--gold)" }}>
                <AppIcon name="coin" size={20} />
              </span>
              <span className="flex-1">
                <strong>
                  {summary.missingPriceCount} tome{summary.missingPriceCount > 1 ? "s" : ""} sans prix.
                </strong>{" "}
                Ajoute {summary.missingPriceCount > 1 ? "leurs prix" : "son prix"} pour un total exact.
              </span>
              <span aria-hidden="true" style={{ color: "var(--gold)" }}>→</span>
            </Link>
          )}

          <div className="rise-in" style={{ animationDelay: "360ms" }}>
            <BookTowerChart months={months} />
          </div>

          <SleepingShelf series={sleeping} />
        </div>
      )}
    </LibraryShell>
  );
}

function EmptyCollection({ hasSeries }: { hasSeries: boolean }) {
  return (
    <div
      className="rounded-3xl p-8 text-center"
      style={{
        background: "radial-gradient(100% 100% at 50% 0%, rgba(248,192,74,0.14) 0%, transparent 60%), var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(248,192,74,0.14)", color: "var(--gold)" }}>
        <AppIcon name="books" size={28} />
      </span>
      <p className="mt-4 text-xl font-bold">Ta collection est vide.</p>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        Ajoute ton premier tome et regarde ta pile grandir.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/ajouter"
          className="rounded-2xl px-5 py-3 text-sm font-bold"
          style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))", color: "white" }}
        >
          Ajouter un tome
        </Link>
        {hasSeries && (
          <Link
            href="/bibliotheque"
            className="rounded-2xl px-5 py-3 text-sm font-semibold"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
          >
            Voir mes séries
          </Link>
        )}
      </div>
    </div>
  );
}
