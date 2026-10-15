import Link from "next/link";
import { AppIcon } from "@/components/app/app-icon";
import { formatEur } from "@/lib/collection/value";

export type SleepingSeries = {
  manga_id: string;
  title: string;
  cover_url: string | null;
  count: number;
  valueEur: number;
};

type Props = { series: SleepingSeries[] };

// Parent space : series with bought volumes not read yet.
export function SleepingShelf({ series }: Props) {
  if (series.length === 0) return null;

  return (
    <section aria-labelledby="sleeping-title">
      <h2 id="sleeping-title" className="flex items-center gap-2 text-lg font-bold">
        <span style={{ color: "var(--sleep)" }}>
          <AppIcon name="moon" size={20} filled />
        </span>
        Achetés, pas encore lus
      </h2>
      <ul className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {series.map((s) => (
          <li key={s.manga_id} className="w-[112px] shrink-0 sm:w-[128px]">
            <Link href={`/bibliotheque/${s.manga_id}`} className="group block">
              <div
                className="relative overflow-hidden rounded-xl transition-transform group-hover:-translate-y-1 group-active:scale-95"
                style={{
                  aspectRatio: "2/3",
                  background: s.cover_url
                    ? `url(${s.cover_url}) center/cover no-repeat, #1a1010`
                    : "linear-gradient(160deg, #2c2450 0%, #15122a 100%)",
                  boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
                }}
              >
                {!s.cover_url && (
                  <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs font-bold">
                    {s.title}
                  </span>
                )}
                <span
                  className="absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[11px] font-extrabold"
                  style={{ background: "var(--sleep)", color: "#120e2a" }}
                >
                  {s.count} à lire
                </span>
              </div>
              <p className="mt-2 truncate text-sm font-semibold">{s.title}</p>
              <p className="text-xs font-semibold tabular-nums" style={{ color: "var(--sleep)" }}>
                {s.valueEur > 0 ? `${formatEur(s.valueEur)} de prix saisis` : "Sans prix saisi"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
