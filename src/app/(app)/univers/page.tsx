import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedVolumes, getReadings, getSeriesMeta } from "@/lib/supabase/queries";
import { loadDiscoveryContext, readerLibrary, withReaderSeries } from "@/lib/supabase/discovery-data";
import { formatEur, formatMonthShort, lastKnownPrice, todayIso } from "@/lib/collection/value";
import { buildShelves } from "@/lib/collection/reading";
import { readingsOverview, spendingOverview, waitingAtHome, wishPrice, wishlistEstimate } from "@/lib/univers/stats";
import { contentContext, territoryDiscoveries, territoryTastes } from "@/lib/discovery/suggest";
import { TERRITORIES, type TerritoryKey } from "@/lib/discovery/territories";
import { AppShell } from "@/components/app/app-shell";
import { AppIcon } from "@/components/app/app-icon";
import { MonthBars } from "@/components/univers/charts";
import { TasteMap, type MapDiscovery } from "@/components/univers/taste-map";
import { Settings } from "@/components/univers/settings";
import { BulkReadForm } from "@/components/parent/bulk-read-form";

export const metadata: Metadata = { title: "Mon univers" };

export default async function UniversPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [series, volumes, readings, { data: profile }, wishesResult, discovery] = await Promise.all([
    getSeriesMeta(supabase, user.id, { includeArchived: true }),
    getOwnedVolumes(supabase, user.id),
    getReadings(supabase, user.id),
    supabase.from("profiles").select("username, avatar_initials").eq("id", user.id).single(),
    supabase.from("wishlist_items").select("manga_id, volume_number, target_price").eq("user_id", user.id),
    loadDiscoveryContext(supabase, user.id),
  ]);
  if (wishesResult.error) throw new Error("Impossible de charger tes envies.");

  const today = todayIso();
  const library = readerLibrary(series, volumes, readings);
  const known = withReaderSeries(discovery.catalogue, series);

  // Taste map : territories from real readings, "J'ai aimé" and declared genres.
  const territories = territoryTastes(library, known, discovery.declared);
  const excluded = new Set([...series.map((s) => s.manga_id), ...discovery.wished, ...discovery.dismissed]);
  const ctx = contentContext(library, known, discovery.declared, discovery.scope);
  const discoveries: Partial<Record<TerritoryKey, MapDiscovery[]>> = Object.fromEntries(
    TERRITORIES.map((t) => [
      t.key,
      territoryDiscoveries(t.key, discovery.catalogue, excluded, ctx, 3).map((c) => ({
        id: c.id,
        title: c.title,
        cover_url: c.cover_url,
      })),
    ])
  );
  const uncounted = library.filter((l) => (l.read + l.owned > 0 || l.liked) && (known.get(l.manga_id)?.genres.length ?? 0) === 0).length;

  const reads = readingsOverview(readings, new Map(series.map((s) => [s.manga_id, s.total_volumes])), today);
  const waiting = waitingAtHome(buildShelves(series.filter((s) => !s.archived_at), volumes, readings));
  const spend = spendingOverview(volumes, today);
  const wishes = wishlistEstimate(
    (wishesResult.data ?? []).map((w) =>
      w.volume_number == null ? ({ kind: "whole_series" } as const) : wishPrice(
        w.target_price == null ? null : Number(w.target_price),
        lastKnownPrice(volumes.filter((v) => v.manga_id === w.manga_id && v.acquisition_type === "bought")),
        spend.averagePaid
      )
    )
  );
  const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

  return (
    <AppShell active="univers" avatarInitials={profile?.avatar_initials ?? undefined}>
      <div className="flex flex-col gap-10">
        <header>
          <h1 className="text-2xl font-bold sm:text-3xl">Mon univers</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Ce que tu aimes, ce que tu lis, ce que tu as dépensé.</p>
        </header>

        {/* Taste */}
        <section aria-labelledby="h-gouts" className="flex flex-col gap-4">
          <div>
            <h2 id="h-gouts" className="text-xl font-bold">Ma carte des goûts</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>Touche un territoire pour voir tes séries et des idées.</p>
          </div>
          <TasteMap territories={territories} discoveries={discoveries} uncounted={uncounted} />
        </section>

        {/* Readings */}
        <section aria-labelledby="h-lectures" className="flex flex-col gap-4">
          <h2 id="h-lectures" className="text-xl font-bold">Mes lectures</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat value={String(reads.total)} label={reads.total > 1 ? "tomes lus" : "tome lu"} />
            <Stat value={String(reads.thisYear)} label={`lus en ${today.slice(0, 4)}`} hint="avec une date" />
            <Stat value={String(reads.seriesFinished)} label={reads.seriesFinished > 1 ? "séries terminées" : "série terminée"} />
            <Stat value={String(reads.inProgress)} label="en cours de lecture" />
          </div>
          <Card>
            <p className="text-sm font-semibold">Tomes finis par mois</p>
            <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>
              {reads.undated > 0
                ? `${plural(reads.undated, "lecture notée sans date n'apparaît", "lectures notées sans date n'apparaissent")} pas ici.`
                : "Les 12 derniers mois."}
            </p>
            <MonthBars
              data={reads.months.map((m) => ({ key: m.key, label: formatMonthShort(m.key), value: m.count, display: plural(m.count, "tome", "tomes") }))}
              color="var(--read)"
              title="Tomes finis par mois, sur les 12 derniers mois"
              unitLabel="Tomes finis"
            />
          </Card>
          <Card>
            <p className="text-sm font-semibold">Qu&apos;est-ce que je peux lire maintenant ?</p>
            {waiting.total === 0 ? (
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                Aucun tome non lu chez toi. <Link href="/decouvrir" className="underline underline-offset-4">Trouver une idée</Link>
              </p>
            ) : (
              <>
                <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>
                  {plural(waiting.total, "tome attend chez toi", "tomes attendent chez toi")}.
                </p>
                <ul className="flex flex-col gap-2">
                  {waiting.series.map((w) => (
                    <li key={w.manga_id}>
                      <Link href={`/bibliotheque/${w.slug}`} className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-1 hover:underline">
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="truncate text-sm font-semibold">{w.title}</span>
                          <span className="h-2 overflow-hidden rounded-full" style={{ background: "var(--background)" }} aria-hidden="true">
                            <span className="block h-full rounded-full" style={{ width: `${Math.max(8, (w.unread / waiting.series[0].unread) * 100)}%`, background: "var(--read)" }} />
                          </span>
                        </span>
                        <span className="text-sm tabular-nums" style={{ color: "var(--muted)" }}>
                          {plural(w.unread, "à lire", "à lire")} <AppIcon name="chevron-right" size={14} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </section>

        {/* Spending */}
        <section aria-labelledby="h-depenses" className="flex flex-col gap-4">
          <div>
            <h2 id="h-depenses" className="text-xl font-bold">Mes dépenses renseignées</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Seulement les prix que tu as notés pour des tomes achetés.
              {spend.boughtCount > 0 && ` Prix renseigné pour ${spend.paidCount} tome${spend.paidCount > 1 ? "s" : ""} sur ${spend.boughtCount} achetés.`}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat value={formatEur(spend.paid)} label="payés" hint={plural(spend.paidCount, "tome avec un prix", "tomes avec un prix")} />
            <Stat value={spend.averagePaid != null ? formatEur(spend.averagePaid) : "–"} label="en moyenne par tome" />
            <Stat
              value={spend.giftsPricedCount ? formatEur(spend.gifts) : "–"}
              label={spend.giftsPricedCount ? "de cadeaux (valeur notée)" : "cadeaux"}
              hint={
                spend.giftsCount === 0
                  ? "Aucun tome offert"
                  : spend.giftsPricedCount === spend.giftsCount
                    ? `${plural(spend.giftsCount, "tome offert", "tomes offerts")}, pas une dépense`
                    : `Valeur notée pour ${spend.giftsPricedCount} sur ${plural(spend.giftsCount, "tome offert", "tomes offerts")}, pas une dépense`
              }
            />
            <Stat
              value={`${spend.paidCount} / ${spend.boughtCount}`}
              label="tomes achetés avec un prix"
              hint={[
                spend.unpricedBought ? plural(spend.unpricedBought, "achat sans prix", "achats sans prix") : null,
                spend.unknownOrigin ? plural(spend.unknownOrigin, "tome d'origine inconnue", "tomes d'origine inconnue") : null,
              ].filter(Boolean).join(" · ") || "Tous tes achats ont un prix"}
            />
          </div>
          <Card>
            <p className="text-sm font-semibold">Dépenses par mois</p>
            <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>
              {spend.undatedPaid > 0
                ? `${formatEur(spend.undatedPaid)} payés à une date inconnue n'apparaissent pas ici.`
                : "Les 12 derniers mois."}
            </p>
            <MonthBars
              data={spend.months.map((m) => ({ key: m.key, label: formatMonthShort(m.key), value: m.amount, display: formatEur(m.amount) }))}
              color="var(--gold)"
              title="Dépenses renseignées par mois, sur les 12 derniers mois"
              unitLabel="Montant payé"
            />
          </Card>
        </section>

        {/* Wishlist estimate */}
        <section aria-labelledby="h-envies" className="flex flex-col gap-4">
          <div>
            <h2 id="h-envies" className="text-xl font-bold">Mes envies</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>Une estimation de ce qu&apos;elles coûteraient. Ce n&apos;est pas une dépense.</p>
          </div>
          {wishes.count === 0 ? (
            <Empty>Pas encore d&apos;envie. <Link href="/decouvrir" className="underline underline-offset-4">Trouver des idées</Link></Empty>
          ) : (
            <Card>
              <p className="text-3xl font-black tabular-nums">≈ {formatEur(wishes.total)}</p>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                {[
                  plural(wishes.count, "envie", "envies"),
                  wishes.knownCount ? `${formatEur(wishes.known)} de prix indicatifs que tu as notés` : null,
                  wishes.estimatedCount ? `${formatEur(wishes.estimated)} estimés d'après les prix que tu as payés` : null,
                  wishes.unknownCount ? `${plural(wishes.unknownCount, "prix inconnu, non compté", "prix inconnus, non comptés")}` : null,
                  wishes.wholeSeriesCount ? `${plural(wishes.wholeSeriesCount, "série entière, non chiffrée", "séries entières, non chiffrées")}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <Link href="/envies" className="mt-3 flex min-h-11 items-center gap-1 text-sm font-semibold" style={{ color: "var(--gold)" }}>
                Voir mes envies <AppIcon name="chevron-right" size={16} />
              </Link>
            </Card>
          )}
        </section>

        {/* Tools & settings */}
        {series.some((s) => !s.archived_at) && (
          <section aria-labelledby="h-outils" className="flex flex-col gap-4">
            <h2 id="h-outils" className="text-xl font-bold">Noter d&apos;anciennes lectures</h2>
            <BulkReadForm series={series.filter((s) => !s.archived_at).map((s) => ({ manga_id: s.manga_id, title: s.title })).sort((a, b) => a.title.localeCompare(b.title, "fr"))} />
          </section>
        )}

        <section id="reglages" aria-labelledby="h-reglages" className="flex scroll-mt-20 flex-col gap-4">
          <h2 id="h-reglages" className="text-xl font-bold">Réglages</h2>
          <Settings username={profile?.username ?? null} email={user.email ?? ""} />
        </section>
      </div>
    </AppShell>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {children}
    </div>
  );
}

function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="rounded-2xl p-3.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-2xl font-black tabular-nums leading-tight">{value}</p>
      <p className="text-sm font-semibold">{label}</p>
      {hint && <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>{hint}</p>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl p-4 text-sm" style={{ background: "var(--surface)", color: "var(--muted)" }}>
      {children}
    </p>
  );
}
