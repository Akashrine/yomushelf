import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedVolumes, getReadings, getSeriesMeta } from "@/lib/supabase/queries";
import { formatEur, formatMonthShort, todayIso } from "@/lib/collection/value";
import { readingsOverview, spendingOverview, tasteMap, wishlistEstimate } from "@/lib/univers/stats";
import type { CatalogueEntry } from "@/lib/discovery/suggest";
import { AppShell } from "@/components/app/app-shell";
import { AppIcon } from "@/components/app/app-icon";
import { MonthBars, ShareBars } from "@/components/univers/charts";
import { Settings } from "@/components/univers/settings";
import { BulkReadForm } from "@/components/parent/bulk-read-form";

export const metadata: Metadata = { title: "Mon univers" };

export default async function UniversPage() {
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
    supabase.from("wishlist_items").select("target_price, mangas ( avg_price_eur )").eq("user_id", user.id),
  ]);
  if (wishesResult.error) throw new Error("Impossible de charger tes envies.");

  const today = todayIso();
  const catalogue: CatalogueEntry[] = series.map((s) => ({
    id: s.manga_id,
    title: s.title,
    author: s.author,
    genres: s.genres,
    demographic: s.demographic,
    audience_min_age: s.audience_min_age,
    total_volumes: s.total_volumes,
    status: s.status,
    top_50_rank: null,
    cover_url: s.cover_url,
  }));
  const library = series.map((s) => ({
    manga_id: s.manga_id,
    read: readings.filter((r) => r.manga_id === s.manga_id && r.status === "read").length,
    owned: volumes.filter((v) => v.manga_id === s.manga_id).length,
  }));

  const taste = tasteMap(library, catalogue);
  const reads = readingsOverview(readings, new Map(series.map((s) => [s.manga_id, s.total_volumes])), today);
  const spend = spendingOverview(volumes, today);
  const wishes = wishlistEstimate(
    (wishesResult.data ?? []).map((w) => ({
      target_price: w.target_price == null ? null : Number(w.target_price),
      fallback_price: (w.mangas as unknown as { avg_price_eur: number | string } | null)?.avg_price_eur != null
        ? Number((w.mangas as unknown as { avg_price_eur: number | string }).avg_price_eur)
        : null,
    }))
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
          <h2 id="h-gouts" className="text-xl font-bold">Mes goûts</h2>
          {taste.genres.length === 0 ? (
            <Empty>
              Ajoute des séries et note tes lectures : ta carte des goûts se dessinera ici.{" "}
              <Link href="/ajouter" className="underline underline-offset-4">Ajouter un manga</Link>
            </Empty>
          ) : (
            <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <Card>
                <p className="text-sm font-semibold">Genres</p>
                <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>Calculé sur tes lectures, et un peu sur tes tomes pas encore lus.</p>
                <ShareBars data={taste.genres} color="var(--sleep)" />
              </Card>
              <Card>
                <p className="mb-3 text-sm font-semibold">Types de manga</p>
                <ShareBars data={taste.demographics} color="var(--sleep)" max={5} />
                {taste.authors.length > 0 && (
                  <>
                    <p className="mb-1 mt-5 text-sm font-semibold">Auteurs que tu lis le plus</p>
                    <ul className="flex flex-col gap-1 text-sm">
                      {taste.authors.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </>
                )}
                <Link href="/decouvrir" className="mt-5 flex min-h-11 items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--read)" }}>
                  <AppIcon name="compass" size={16} /> Des idées qui te ressemblent
                </Link>
              </Card>
            </div>
          )}
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
        </section>

        {/* Spending */}
        <section aria-labelledby="h-depenses" className="flex flex-col gap-4">
          <div>
            <h2 id="h-depenses" className="text-xl font-bold">Mes dépenses renseignées</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>Seulement les prix que tu as notés pour des tomes achetés.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat value={formatEur(spend.paid)} label="payés" hint={plural(spend.paidCount, "tome avec un prix", "tomes avec un prix")} />
            <Stat value={spend.averagePaid != null ? formatEur(spend.averagePaid) : "–"} label="en moyenne par tome" />
            <Stat value={formatEur(spend.gifts)} label="de cadeaux" hint={`${plural(spend.giftsCount, "tome offert", "tomes offerts")}, pas une dépense`} />
            <Stat value={String(spend.unpricedBought + spend.unknownOrigin)} label="tomes sans prix ou sans origine" hint="Facultatif : à compléter si tu veux" />
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
                  wishes.knownCount ? `${formatEur(wishes.known)} avec les prix que tu as notés` : null,
                  wishes.estimatedCount ? `${formatEur(wishes.estimated)} estimés au prix moyen d'un tome` : null,
                  wishes.unknownCount ? `${plural(wishes.unknownCount, "prix inconnu", "prix inconnus")}` : null,
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
        <section aria-labelledby="h-outils" className="flex flex-col gap-4">
          <h2 id="h-outils" className="text-xl font-bold">Noter d&apos;anciennes lectures</h2>
          <BulkReadForm series={series.filter((s) => !s.archived_at).map((s) => ({ manga_id: s.manga_id, title: s.title })).sort((a, b) => a.title.localeCompare(b.title, "fr"))} />
        </section>

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
