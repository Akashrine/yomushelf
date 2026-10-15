import Link from "next/link";
import { AppIcon } from "@/components/app/app-icon";

type Stats = {
  total_series: number;
  total_volumes_owned: number;
  total_budget_eur: number;
  volumes_read: number;
} | null;

export type AppSection = "collection" | "bibliotheque" | "envies" | "ajouter" | "parent";

type Props = {
  username: string | null;
  avatarInitials: string;
  stats?: Stats;
  active?: AppSection;
  children: React.ReactNode;
};

const NAV = [
  { key: "collection", href: "/collection", label: "Accueil", short: "Accueil", icon: "home" },
  { key: "bibliotheque", href: "/bibliotheque", label: "Mes séries", short: "Séries", icon: "books" },
  { key: "envies", href: "/envies", label: "Envies", short: "Envies", icon: "star" },
  { key: "ajouter", href: "/ajouter", label: "Ajouter", short: "Ajouter", icon: "plus" },
] as const;

export function LibraryShell({
  username,
  avatarInitials,
  stats,
  active = "bibliotheque",
  children,
}: Props) {
  const isParent = active === "parent";
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header — the parent space gets its own tint so nobody mixes them up */}
      <header
        className="sticky top-0 z-20 px-4 sm:px-6 py-3 flex items-center justify-between gap-3"
        style={{
          background: isParent ? "#1d1a24" : "color-mix(in srgb, var(--background) 88%, transparent)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${isParent ? "#2e2a3a" : "var(--border)"}`,
        }}
      >
        <Link href="/collection" className="flex items-center gap-2">
          <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>漫</span>
          <span className="text-sm font-semibold">Yomushelf</span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden sm:flex items-center gap-1 text-sm">
          {NAV.map((item) => {
            const isActive = item.key === active;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors hover:opacity-90"
                style={
                  isActive
                    ? { background: "var(--surface-raised)", color: "var(--foreground)" }
                    : { color: "var(--muted)" }
                }
              >
                <AppIcon name={item.icon} size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {isParent ? (
            <Link
              href="/collection"
              className="flex min-h-11 items-center rounded-full px-3 text-xs font-semibold"
              style={{ border: "1px solid #3a3550", color: "#cfc6ff" }}
            >
              Espace lecteur
            </Link>
          ) : (
            <Link
              href="/parent"
              className="flex min-h-11 items-center rounded-full px-3 text-xs"
              style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
            >
              Espace parent
            </Link>
          )}
          <Link href="/profil" title={username ?? "Profil"} aria-label="Mon profil" className="flex h-11 w-11 items-center justify-center">
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
          <StatPill label="Tomes chez toi" value={stats.total_volumes_owned ?? 0} />
          <StatPill label="Lus" value={stats.volumes_read ?? 0} />
        </div>
      )}

      {/* Page content — bottom padding leaves room for the mobile tab bar */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 pb-28 sm:pb-10">
        {children}
      </main>

      {/* Mobile tab bar */}
      <nav
        aria-label="Navigation principale"
        className="sm:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-4 px-2 pt-2"
        style={{
          background: "color-mix(in srgb, var(--surface) 92%, transparent)",
          backdropFilter: "blur(14px)",
          borderTop: "1px solid var(--border)",
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        }}
      >
        {NAV.map((item) => {
          const isActive = item.key === active;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-col items-center gap-1 py-1.5 text-[11px] font-semibold"
              style={{ color: isActive ? "var(--foreground)" : "var(--muted)" }}
            >
              <span
                className="flex h-8 w-12 items-center justify-center rounded-full transition-colors"
                style={{
                  background: isActive ? "color-mix(in srgb, var(--read) 18%, transparent)" : "transparent",
                  color: isActive ? "var(--read)" : undefined,
                }}
              >
                <AppIcon name={item.icon} size={20} filled={isActive && item.icon === "star"} />
              </span>
              {item.short}
            </Link>
          );
        })}
      </nav>
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
