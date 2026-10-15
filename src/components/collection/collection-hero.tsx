import { AppIcon } from "@/components/app/app-icon";
import { CountUp } from "@/components/collection/count-up";
import { formatEur, type CollectionSummary } from "@/lib/collection/value";

type Props = { summary: CollectionSummary };

// Sum of the prices typed in, split into paid / given / origin not specified.
// Not a resale value : only what was entered.
export function CollectionHero({ summary }: Props) {
  const { valueEur, paidEur, giftEur } = summary;
  // rounded : float leftovers must not show up as "Autre 0,00 €"
  const otherEur = Math.max(0, Math.round((valueEur - paidEur - giftEur) * 100) / 100);
  const share = (n: number) => (valueEur > 0 ? (n / valueEur) * 100 : 0);

  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
      style={{
        background:
          "radial-gradient(90% 120% at 0% 0%, rgba(248,192,74,0.20) 0%, transparent 55%), radial-gradient(80% 100% at 100% 100%, rgba(255,106,61,0.16) 0%, transparent 60%), linear-gradient(160deg, #241a16 0%, #181212 100%)",
        border: "1px solid rgba(248,192,74,0.22)",
      }}
    >
      {/* Soft glow behind the number */}
      <div
        className="glow-pulse pointer-events-none absolute -left-10 -top-16 h-56 w-56 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(248,192,74,0.35) 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative">
        <p id="hero-title" className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em]" style={{ color: "var(--gold)" }}>
          <AppIcon name="coin" size={18} />
          Valeur renseignée des livres
        </p>

        <p className="mt-2 text-[3.4rem] font-black leading-none tracking-tight tabular-nums sm:text-7xl">
          <CountUp value={valueEur} className="text-gold-gradient" />
        </p>
        <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
          Somme des prix saisis, hors emprunts. Ce n&apos;est pas une valeur de revente.
        </p>

        {valueEur > 0 && (
          <>
            {/* Split bar : what was paid vs what was given */}
            <div
              className="mt-6 flex h-4 w-full overflow-hidden rounded-full"
              style={{ background: "rgba(255,255,255,0.06)" }}
              role="img"
              aria-label={`Dont ${formatEur(paidEur)} payés, ${formatEur(giftEur)} offerts et ${formatEur(otherEur)} d'origine non précisée`}
            >
              <div className="grow-x h-full" style={{ width: `${share(paidEur)}%`, background: "linear-gradient(90deg, var(--read-deep), var(--read))" }} />
              <div className="grow-x h-full" style={{ width: `${share(giftEur)}%`, background: "linear-gradient(90deg, var(--gold-deep), var(--gold))", animationDelay: "250ms" }} />
              <div className="grow-x h-full" style={{ width: `${share(otherEur)}%`, background: "var(--muted)", animationDelay: "400ms" }} />
            </div>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--read)" }} />
                Acheté {formatEur(paidEur)}
              </span>
              {giftEur > 0 && (
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--gold)" }} />
                  Offert {formatEur(giftEur)}
                </span>
              )}
              {otherEur > 0 && (
                <span className="flex items-center gap-2" style={{ color: "var(--muted)" }}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--muted)" }} />
                  Origine non précisée {formatEur(otherEur)}
                </span>
              )}
            </div>

            {giftEur > 0 && (
              <p className="mt-4 flex items-start gap-2 text-sm" style={{ color: "#e9d9c6" }}>
                <AppIcon name="gift" size={18} className="mt-0.5 shrink-0" />
                <span>
                  Les cadeaux valent <strong style={{ color: "var(--gold)" }}>{formatEur(giftEur)}</strong>, mais ils n&apos;ont rien coûté.
                </span>
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
