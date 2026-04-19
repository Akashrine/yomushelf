export function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ background: "var(--surface)" }}>
          <div style={{ aspectRatio: "2/3", background: "var(--surface-raised)" }} />
          <div className="px-2 py-1.5 space-y-1.5">
            <div className="h-2.5 rounded" style={{ background: "var(--surface-raised)", width: "80%" }} />
            <div className="h-2 rounded" style={{ background: "var(--surface-raised)", width: "50%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
