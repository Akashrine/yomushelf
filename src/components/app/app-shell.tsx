import Link from "next/link";
import { AppIcon } from "@/components/app/app-icon";

export type AppSpace = "bibliotheque" | "decouvrir" | "univers" | null;

const SPACES = [
  { key: "bibliotheque", href: "/bibliotheque", label: "Ma collection", icon: "books" },
  { key: "decouvrir", href: "/decouvrir", label: "Découvrir", icon: "compass" },
] as const;

type Props = {
  active: AppSpace;
  avatarInitials?: string;
  children: React.ReactNode;
  // Pages that already show their own add button can hide the header one.
  hideMobileAdd?: boolean;
};

// Two places (my collection, discover) and one big "+" : nothing else to
// learn. Stats and settings ("Mon univers") sit behind the avatar.
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
        className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2 sm:px-6"
        style={{
          background: "color-mix(in srgb, var(--background) 90%, transparent)",
          backdropFilter: "blur(12px)",
          paddingTop: "max(0.5rem, env(safe-area-inset-top))",
        }}
      >
        <Link href="/bibliotheque" className="flex min-h-11 items-center gap-2">
          <span className="text-lg font-bold" style={{ color: "var(--accent)" }} aria-hidden="true">漫</span>
          <span className="text-xs font-semibold tracking-[0.3em]">YOMUSHELF</span>
          <span className="sr-only">, ma collection</span>
        </Link>

        <nav aria-label="Espaces" className="hidden items-center gap-1 text-sm md:flex">
          {SPACES.map((s) => {
            const on = s.key === active;
            return (
              <Link
                key={s.key}
                href={s.href}
                aria-current={on ? "page" : undefined}
                className="flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold"
                style={on ? { background: "var(--surface-raised)", color: "var(--foreground)" } : { color: "var(--muted)" }}
              >
                <AppIcon name={s.icon} size={17} />
                {s.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {!hideMobileAdd && (
            <Link
              href="/ajouter"
              className="hidden min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold md:flex"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              <AppIcon name="plus" size={18} strokeWidth={2.5} />
              Ajouter
            </Link>
          )}
          {avatarInitials && (
            <Link
              href="/univers"
              aria-label={`${avatarInitials}, mon univers et mes réglages`}
              aria-current={active === "univers" ? "page" : undefined}
              className="flex h-11 w-11 items-center justify-center"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
                style={
                  active === "univers"
                    ? { background: "var(--foreground)", color: "var(--background)" }
                    : { background: "var(--surface-raised)", border: "1px solid var(--border)" }
                }
              >
                {avatarInitials}
              </span>
            </Link>
          )}
        </div>
      </header>

      <main id="contenu" className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 pb-28 sm:px-6 md:pb-12">
        {children}
      </main>

      <nav
        aria-label="Espaces"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 items-center px-2 pt-1.5 md:hidden"
        style={{
          background: "color-mix(in srgb, var(--surface) 94%, transparent)",
          backdropFilter: "blur(14px)",
          borderTop: "1px solid var(--border)",
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <TabLink space={SPACES[0]} on={active === SPACES[0].key} />
        <Link
          href="/ajouter"
          aria-label="Ajouter un manga"
          className="mx-auto -mt-6 flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)", boxShadow: "0 8px 20px rgba(173,75,44,0.35)" }}
        >
          <AppIcon name="plus" size={30} strokeWidth={2.75} />
        </Link>
        <TabLink space={SPACES[1]} on={active === SPACES[1].key} />
      </nav>
    </div>
  );
}

function TabLink({ space, on }: { space: (typeof SPACES)[number]; on: boolean }) {
  return (
    <Link
      href={space.href}
      aria-current={on ? "page" : undefined}
      className="flex min-h-12 flex-col items-center justify-center gap-0.5 text-xs font-semibold"
      style={{ color: on ? "var(--accent)" : "var(--muted)" }}
    >
      <AppIcon name={space.icon} size={24} />
      {space.label}
    </Link>
  );
}
