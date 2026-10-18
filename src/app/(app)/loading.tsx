// Shown while a screen loads : the shape of the page, no fake content.
// Not a <main> : the page's own main landmark stays the only one.
// Manga panels in outline ; the pulse stops with reduced motion.
const INK = "var(--ink, #12151d)";

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-32 pt-6 sm:px-6" aria-busy="true">
      <p className="sr-only" role="status">Chargement…</p>
      <div className="flex items-center gap-3">
        <div className="h-9 w-48 rounded-xl motion-safe:animate-pulse" style={{ background: "var(--surface-raised)" }} />
        <span
          aria-hidden="true"
          className="manga-sticker font-display rounded-xl px-3 py-0.5 text-lg tracking-wide"
          style={{ background: "var(--pop, #ffd23f)", color: INK, transform: "rotate(-4deg)", fontWeight: 400 }}
        >
          Chargement…
        </span>
      </div>
      <div className="manga-panel h-40 rounded-3xl motion-safe:animate-pulse" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="manga-panel-sm h-28 rounded-xl motion-safe:animate-pulse"
            style={{ background: "var(--surface)" }}
          />
        ))}
      </div>
    </div>
  );
}
