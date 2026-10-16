import type { Metadata } from "next";
import Link from "next/link";
import { ShelfHero } from "@/components/landing/shelf-hero";
import { CollectionPreview } from "@/components/landing/collection-preview";
import { ReadingPreview } from "@/components/landing/reading-preview";
import { getLandingCovers } from "@/lib/landing/covers";

export const revalidate = 60;

const TITLE = "Yomushelf : ses mangas, et où il en est";
const DESCRIPTION =
  "La collection de mangas de ton enfant avec les vraies couvertures, et sa lecture tome par tome. Gratuit, sans pub, sans profil public.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.yomushelf.com" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://www.yomushelf.com", locale: "fr_FR", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

function SignupButton() {
  return (
    <Link
      href="/signup"
      className="flex min-h-12 items-center justify-center rounded-lg px-6 text-base font-semibold transition-colors"
      style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
    >
      Créer un compte
    </Link>
  );
}

export default async function LandingPage() {
  const covers = await getLandingCovers();
  const [first, second] = covers;

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--background)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight" style={{ color: "var(--accent)" }} aria-hidden="true">漫</span>
          <span className="text-base font-semibold tracking-tight">Yomushelf</span>
        </div>
        <Link href="/login" className="flex min-h-11 items-center rounded-lg px-4 text-sm font-medium" style={{ color: "var(--muted)" }}>
          Connexion
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pt-14 pb-16 lg:grid-cols-2 lg:gap-16 lg:pt-24 lg:pb-24">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-5">
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl xl:text-6xl">
                Ses mangas,
                <br />
                <span style={{ color: "var(--accent)" }}>et où il en est.</span>
              </h1>
              <p className="max-w-md text-lg leading-relaxed" style={{ color: "var(--muted)" }}>
                La collection de ton enfant avec les vraies couvertures, et sa lecture tome par tome. Simple pour lui,
                clair pour toi.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SignupButton />
              <Link href="/login" className="flex min-h-12 items-center justify-center px-4 text-sm font-medium" style={{ color: "var(--muted)" }}>
                J&apos;ai déjà un compte
              </Link>
            </div>
            <p className="text-sm" style={{ color: "var(--muted)" }}>Gratuit. Pas de pub, pas de profil public.</p>
          </div>
          <ShelfHero covers={covers} />
        </section>

        <section style={{ borderTop: "1px solid var(--border)" }}>
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Voir sa collection</h2>
              <p className="max-w-md text-base leading-relaxed" style={{ color: "var(--muted)" }}>
                Toutes ses séries sur une étagère, avec les vraies couvertures. Tu vois d&apos;un coup d&apos;œil les tomes
                qu&apos;il a et ceux qui manquent. Fini le tome acheté en double.
              </p>
            </div>
            <CollectionPreview cover={first} />
          </div>
        </section>

        <section style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col gap-4 lg:order-2">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Suivre sa lecture</h2>
              <p className="max-w-md text-base leading-relaxed" style={{ color: "var(--muted)" }}>
                Le dernier tome lu, le prochain à lire. Il le note lui-même en un geste, et tu sais où il en est sans
                avoir à demander.
              </p>
            </div>
            <div className="lg:order-1">
              <ReadingPreview cover={second} />
            </div>
          </div>
        </section>

        <section style={{ borderTop: "1px solid var(--border)" }}>
          <div className="mx-auto flex max-w-xl flex-col items-center gap-6 px-6 py-20 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Commence par une série.</h2>
            <p className="text-base" style={{ color: "var(--muted)" }}>
              Crée un compte, ajoute celle qu&apos;il lit en ce moment. Le reste suit.
            </p>
            <SignupButton />
            <p className="text-sm" style={{ color: "var(--muted)" }}>Ses données restent privées.</p>
          </div>
        </section>
      </main>

      <footer
        className="flex flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row"
        style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <span style={{ color: "var(--accent)" }} aria-hidden="true">漫</span>
          <span>Yomushelf</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-4 text-xs" aria-label="Informations légales">
          <Link href="/mentions-legales" className="flex min-h-11 items-center">Mentions légales</Link>
          <Link href="/confidentialite" className="flex min-h-11 items-center">Confidentialité</Link>
        </nav>
        <p className="text-xs">© {new Date().getFullYear()} Yomushelf</p>
      </footer>
    </div>
  );
}
