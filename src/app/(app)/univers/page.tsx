import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/session";
import { getOwnedVolumes, getReadings, getSeriesMeta } from "@/lib/supabase/queries";
import { formatEur, todayIso } from "@/lib/collection/value";
import { readingsOverview, spendingOverview } from "@/lib/univers/stats";
import { AppShell } from "@/components/app/app-shell";

export const metadata: Metadata = { title: "Mon univers" };

export default async function UniversPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login");

  const [series, volumes, readings, { data: profile }] = await Promise.all([
    getSeriesMeta(supabase, user.id, { includeArchived: true }),
    getOwnedVolumes(supabase, user.id),
    getReadings(supabase, user.id),
    supabase.from("profiles").select("avatar_initials").eq("id", user.id).single(),
  ]);

  const today = todayIso();
  const reads = readingsOverview(readings, new Map(series.map((s) => [s.manga_id, s.total_volumes])), today);
  const spend = spendingOverview(volumes, today);
  const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

  return (
    <AppShell active="univers" avatarInitials={profile?.avatar_initials ?? undefined}>
      <div className="flex flex-col gap-10">
        <header className="manga-halftone rounded-3xl px-4 py-5 sm:px-6">
          <h1 className="text-5xl sm:text-6xl" style={{ color: "var(--ink)" }}>Mon univers</h1>
          <p className="mt-2 text-base font-medium" style={{ color: "var(--ink)" }}>Ce que tu lis, ce que tu as dépensé.</p>
        </header>

        {/* Readings */}
        <section aria-labelledby="h-lectures" className="flex flex-col gap-4">
          <h2 id="h-lectures" className="text-3xl sm:text-4xl" style={{ color: "var(--ink)" }}>Mes lectures</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat value={String(reads.total)} label={reads.total > 1 ? "tomes lus" : "tome lu"} />
            <Stat value={String(reads.thisYear)} label={`lus en ${today.slice(0, 4)}`} hint="avec une date" />
            <Stat value={String(reads.seriesFinished)} label={reads.seriesFinished > 1 ? "séries terminées" : "série terminée"} />
            <Stat value={String(reads.inProgress)} label="en cours de lecture" />
          </div>
        </section>

        {/* Spending */}
        <section aria-labelledby="h-depenses" className="flex flex-col gap-4">
          <div>
            <h2 id="h-depenses" className="text-3xl sm:text-4xl" style={{ color: "var(--ink)" }}>Mes dépenses renseignées</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Seulement les prix que tu as notés pour des tomes achetés.
              {spend.boughtCount > 0 && ` Prix renseigné pour ${spend.paidCount} tome${spend.paidCount > 1 ? "s" : ""} sur ${spend.boughtCount} achetés.`}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat value={formatEur(spend.paid)} label="payés" hint={plural(spend.paidCount, "tome avec un prix", "tomes avec un prix")} />
            <Stat value={spend.averagePaid != null ? formatEur(spend.averagePaid) : "–"} label="en moyenne par tome" />
            <Stat
              value={spend.giftsPricedCount ? formatEur(spend.gifts) : "–"}
              label={spend.giftsPricedCount ? "de cadeaux (valeur notée)" : "cadeaux"}
              hint={spend.giftsCount === 0 ? "Aucun tome offert" : `${plural(spend.giftsCount, "tome offert", "tomes offerts")}, pas une dépense`}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="manga-panel-sm rounded-2xl p-3.5" style={{ background: "var(--surface)" }}>
      <p className="font-display text-4xl leading-none tracking-wide tabular-nums" style={{ color: "var(--ink)" }}>{value}</p>
      <p className="mt-1 text-sm font-bold" style={{ color: "var(--ink)" }}>{label}</p>
      {hint && <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>{hint}</p>}
    </div>
  );
}

