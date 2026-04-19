import Link from "next/link";

type Stats = {
  total_series: number;
  total_volumes_owned: number;
  total_budget_eur: number;
  volumes_read: number;
} | null;

type Props = {
  username: string | null;
  avatarInitials: string;
  stats: Stats;
  children: React.ReactNode;
};

export function LibraryShell({ username, avatarInitials, stats, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{
          background: "var(--background)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>漫</span>
          <span className="text-sm font-semibold">Yomushelf</span>
        </div>

        <nav className="hidden sm:flex items-center gap-1 text-sm">
          <Link
            href="/bibliotheque"
            className="px-3 py-1.5 rounded-lg font-medium"
            style={{ background: "var(--surface)", color: "var(--foreground)" }}
          >
            Bibliothèque
          </Link>
          <Link
            href="/ajouter"
            className="px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ color: "var(--muted)" }}
          >
            + Ajouter
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/ajouter" className="sm:hidden text-sm font-medium" style={{ color: "var(--accent)" }}>
            + Ajouter
          </Link>
          <Link href="/profil" title={username ?? "Profil"}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {avatarInitials}
            </div>
          </Link>
        </div>
      </header>

      {/* Stats bar */}
      {stats && (
        <div
          className="px-4 sm:px-6 py-3 flex items-center gap-6 overflow-x-auto"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <StatPill label="Séries" value={stats.total_series} />
          <StatPill label="Tomes" value={stats.total_volumes_owned ?? 0} />
          <StatPill
            label="Budget estimé"
            value={`${Number(stats.total_budget_eur ?? 0).toFixed(0)} €`}
          />
          {(stats.volumes_read ?? 0) > 0 && (
            <StatPill label="Lus" value={stats.volumes_read} />
          )}
        </div>
      )}

      {/* Page content */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="shrink-0 flex flex-col">
      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <span className="text-base font-bold tabular-nums">{value}</span>
    </div>
  );
}
