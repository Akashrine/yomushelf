import Link from "next/link";

export function PublicHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header
      className="sticky top-0 z-20 px-4 sm:px-6 py-3 flex items-center justify-between"
      style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}
    >
      <Link href="/" className="flex items-center gap-2">
        <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>漫</span>
        <span className="text-sm font-semibold">Yomushelf</span>
      </Link>

      {!isAuthenticated && (
        <Link
          href="/signup"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: "var(--accent)", color: "white" }}
        >
          Crée ta bibliothèque
        </Link>
      )}

      {isAuthenticated && (
        <Link
          href="/bibliotheque"
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: "var(--muted)" }}
        >
          Ma bibliothèque →
        </Link>
      )}
    </header>
  );
}
