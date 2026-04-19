import type { TopCover } from "@/lib/og/data";

export function PublicTopCollection({ covers }: { covers: TopCover[] }) {
  const visible = covers.filter((c) => c.cover_url).slice(0, 20);

  if (visible.length === 0) return null;

  return (
    <section>
      <h2
        className="text-xs uppercase tracking-wider font-semibold mb-3"
        style={{ color: "var(--muted)" }}
      >
        Collection · {visible.length} séries
      </h2>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {visible.map((cover) => (
          <div
            key={cover.manga_id}
            className="rounded-lg overflow-hidden"
            style={{
              aspectRatio: "2/3",
              background: `url(${cover.cover_url}) center/cover no-repeat, var(--surface)`,
              border: "1px solid var(--border)",
            }}
            title={cover.title}
          />
        ))}
      </div>
    </section>
  );
}
