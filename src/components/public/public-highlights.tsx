import type { Highlights } from "@/lib/og/data";

export function PublicHighlights({ highlights }: { highlights: Highlights }) {
  const items = [
    highlights.most_volumes && {
      icon: "🏆",
      label: "Série la plus complète",
      value: highlights.most_volumes.title,
      sub: `${highlights.most_volumes.owned} tomes`,
      cover: highlights.most_volumes.cover_url,
    },
    highlights.completed_series > 0 && {
      icon: "✅",
      label: "Séries terminées",
      value: String(highlights.completed_series),
      sub: highlights.completed_series > 1 ? "collections complètes" : "collection complète",
      cover: null,
    },
    highlights.top_genre && {
      icon: "📚",
      label: "Genre favori",
      value: highlights.top_genre,
      sub: "le plus représenté",
      cover: null,
    },
  ].filter(Boolean) as {
    icon: string;
    label: string;
    value: string;
    sub: string;
    cover: string | null;
  }[];

  if (items.length === 0) return null;

  return (
    <section>
      <h2
        className="text-xs uppercase tracking-wider font-semibold mb-3"
        style={{ color: "var(--muted)" }}
      >
        Highlights
      </h2>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-xl p-3"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            {item.cover ? (
              <div
                className="shrink-0 w-10 rounded-md overflow-hidden"
                style={{
                  aspectRatio: "2/3",
                  background: `url(${item.cover}) center/cover no-repeat, var(--surface-raised)`,
                }}
              />
            ) : (
              <span className="text-xl shrink-0 w-10 text-center">{item.icon}</span>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                {item.label}
              </p>
              <p className="text-sm font-semibold leading-tight truncate">{item.value}</p>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
