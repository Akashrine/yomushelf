// Shown while a screen loads : the shape of the page, no fake content.
// Not a <main> : the page's own main landmark stays the only one.
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-28 pt-6 sm:px-6" aria-busy="true">
      <p className="sr-only" role="status">Chargement…</p>
      <div className="h-8 w-48 animate-pulse rounded-xl" style={{ background: "var(--surface)" }} />
      <div className="h-40 animate-pulse rounded-3xl" style={{ background: "var(--surface)" }} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl" style={{ background: "var(--surface)" }} />
        ))}
      </div>
    </div>
  );
}
