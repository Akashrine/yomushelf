import Link from "next/link";
import { AppIcon } from "@/components/app/app-icon";

export type AppSpace = "bibliotheque" | "decouvrir" | "univers" | "reglages" | null;

const SPACES = [
  { key: "bibliotheque", href: "/bibliotheque", label: "Ma collection", icon: "books" },
  { key: "decouvrir", href: "/decouvrir", label: "Découvrir", icon: "compass" },
] as const;

// Manga design system (docs/design.md) : ink lines, sticker yellow with ink text.
const INK = "var(--ink, #12151d)";
const POP = "var(--pop, #ffd23f)";

type Props = {
  active: AppSpace;
  avatarInitials?: string;
  children: React.ReactNode;
  // Pages that already show their own add button can hide the header one.
  hideMobileAdd?: boolean;
};

// Two places (my collection, discover) and one big "+" : nothing else to
// learn. Stats ("Mon univers") sit behind the avatar, settings behind the gear.
export function AppShell({ active, avatarInitials, children, hideMobileAdd = false }: Props) {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <a
        href="#contenu"
        className="manga-panel-sm sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:px-4 focus:py-3 focus:font-bold"
        style={{ background: POP, color: INK }}
      >
        Aller au contenu
      </a>
      <header
        className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2 sm:px-6"
        style={{
          background: "color-mix(in srgb, var(--background) 94%, transparent)",
          backdropFilter: "blur(12px)",
          borderBottom: `3px solid ${INK}`,
          paddingTop: "max(0.5rem, env(safe-area-inset-top))",
        }}
      >
        <Link href="/bibliotheque" className="flex min-h-11 items-center gap-2" style={{ color: INK }}>
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg"
            style={{ background: INK, color: POP }}
            aria-hidden="true"
          >
            漫
          </span>
          <span className="font-display text-2xl leading-none tracking-wide" style={{ fontWeight: 400 }}>
            YOMUSHELF
          </span>
          <span className="sr-only">, ma collection</span>
        </Link>

        <nav aria-label="Espaces" className="hidden items-center gap-2 text-sm md:flex">
          {SPACES.map((s) => {
            const on = s.key === active;
            return (
              <Link
                key={s.key}
                href={s.href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-xl px-3 font-bold ${on ? "manga-panel-sm" : ""}`}
                style={on ? { background: POP, color: INK } : { color: "var(--foreground)", border: "2px solid transparent" }}
              >
                <AppIcon name={s.icon} size={18} />
                {s.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {!hideMobileAdd && (
            <Link
              href="/ajouter"
              className="manga-button hidden min-h-12 items-center gap-1.5 rounded-2xl px-4 text-sm font-bold md:flex"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              <AppIcon name="plus" size={18} strokeWidth={2.75} />
              Ajouter
            </Link>
          )}
          <Link
            href="/reglages"
            aria-label="Réglages"
            aria-current={active === "reglages" ? "page" : undefined}
            className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            style={active === "reglages" ? { background: INK, color: POP } : { color: INK }}
          >
            <AppIcon name="settings" size={24} />
          </Link>
          {avatarInitials && (
            <Link
              href="/univers"
              aria-label={`${avatarInitials}, mon univers`}
              aria-current={active === "univers" ? "page" : undefined}
              className="flex h-11 w-11 items-center justify-center"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold"
                style={
                  active === "univers"
                    ? { background: INK, color: POP, border: `2px solid ${INK}` }
                    : { background: "var(--surface)", color: INK, border: `2px solid ${INK}` }
                }
              >
                {avatarInitials}
              </span>
            </Link>
          )}
        </div>
      </header>

      <main id="contenu" className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 pb-32 sm:px-6 md:pb-12">
        {children}
      </main>

      <nav
        aria-label="Espaces"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 items-center px-2 pt-1.5 md:hidden"
        style={{
          background: "var(--surface)",
          borderTop: `3px solid ${INK}`,
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <TabLink space={SPACES[0]} on={active === SPACES[0].key} />
        <Link
          href="/ajouter"
          aria-label="Ajouter un manga"
          className="manga-button mx-auto -mt-8 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          <AppIcon name="plus" size={32} strokeWidth={3} />
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
      className="flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-bold"
      style={{ color: on ? INK : "var(--muted)" }}
    >
      <span
        className="flex h-8 w-14 items-center justify-center rounded-xl"
        style={on ? { background: POP, color: INK, border: `2px solid ${INK}` } : { border: "2px solid transparent" }}
      >
        <AppIcon name={space.icon} size={22} />
      </span>
      {space.label}
    </Link>
  );
}
