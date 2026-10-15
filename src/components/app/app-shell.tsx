import Link from "next/link";
import { AppIcon } from "@/components/app/app-icon";

export type AppSpace = "bibliotheque" | "decouvrir" | "univers" | null;

const SPACES = [
  { key: "bibliotheque", href: "/bibliotheque", label: "Ma bibliothèque", short: "Bibliothèque", icon: "books" },
  { key: "decouvrir", href: "/decouvrir", label: "Découvrir", short: "Découvrir", icon: "compass" },
  { key: "univers", href: "/univers", label: "Mon univers", short: "Mon univers", icon: "chart" },
] as const;

type Props = {
  active: AppSpace;
  avatarInitials?: string;
  children: React.ReactNode;
  // Pages that already show their own add button can hide the header one on phones.
  hideMobileAdd?: boolean;
};

// Three spaces, and "Ajouter un manga" always one tap away.
export function AppShell({ active, avatarInitials, children, hideMobileAdd = false }: Props) {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--background)" }}>
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:px-3 focus:py-2"
        style={{ background: "var(--surface-raised)" }}
      >
        Aller au contenu
      </a>
      <header
        className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6"
        style={{
          background: "color-mix(in srgb, var(--background) 90%, transparent)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
          paddingTop: "max(0.625rem, env(safe-area-inset-top))",
        }}
      >
        <Link href="/bibliotheque" className="flex min-h-11 items-center gap-2">
          <span className="text-lg font-bold" style={{ color: "var(--accent)" }} aria-hidden="true">漫</span>
          <span className="text-sm font-semibold">Yomushelf</span>
          <span className="sr-only">, ma bibliothèque</span>
        </Link>

        <nav aria-label="Espaces" className="hidden items-center gap-1 text-sm md:flex">
          {SPACES.map((s) => {
            const on = s.key === active;
            return (
              <Link
                key={s.key}
                href={s.href}
                aria-current={on ? "page" : undefined}
                className="flex min-h-11 items-center gap-2 rounded-xl px-3 font-medium"
                style={on ? { background: "var(--surface-raised)", color: "var(--foreground)" } : { color: "var(--muted)" }}
              >
                <AppIcon name={s.icon} size={17} />
                {s.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/ajouter"
            className={`${hideMobileAdd ? "hidden md:flex" : "flex"} min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-white`}
            style={{ background: "linear-gradient(135deg, var(--read), var(--read-deep))" }}
          >
            <AppIcon name="plus" size={18} strokeWidth={2.5} />
            <span>Ajouter<span className="hidden sm:inline"> un manga</span></span>
          </Link>
          {avatarInitials && (
            <Link href="/univers#reglages" aria-label={`${avatarInitials}, mes réglages`} className="flex h-11 w-11 items-center justify-center">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
              >
                {avatarInitials}
              </span>
            </Link>
          )}
        </div>
      </header>

      <main id="contenu" className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-28 sm:px-6 md:pb-12">
        {children}
      </main>

      <nav
        aria-label="Espaces"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 px-2 pt-1.5 md:hidden"
        style={{
          background: "color-mix(in srgb, var(--surface) 94%, transparent)",
          backdropFilter: "blur(14px)",
          borderTop: "1px solid var(--border)",
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        }}
      >
        {SPACES.map((s) => {
          const on = s.key === active;
          return (
            <Link
              key={s.key}
              href={s.href}
              aria-current={on ? "page" : undefined}
              className="flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold"
              style={{ color: on ? "var(--foreground)" : "var(--muted)" }}
            >
              <span
                className="flex h-7 w-12 items-center justify-center rounded-full"
                style={{ background: on ? "color-mix(in srgb, var(--read) 18%, transparent)" : "transparent", color: on ? "var(--read)" : undefined }}
              >
                <AppIcon name={s.icon} size={20} />
              </span>
              {s.short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
