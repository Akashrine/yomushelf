import type { Metadata } from "next";
import Link from "next/link";
import { LandingDeck } from "@/components/landing/landing-deck";
import { CollectionPreview } from "@/components/landing/collection-preview";
import { ReadingPreview } from "@/components/landing/reading-preview";
import { getLandingDeck } from "@/lib/landing/covers";

export const revalidate = 60;

const TITLE = "Yomushelf : ses mangas, et où il en est";
const DESCRIPTION =
  "La collection de mangas de ton enfant avec les vraies couvertures, et sa lecture tome par tome. Gratuit, sans pub, sans profil public.";
// A page-level openGraph replaces the root one, file-based image included :
// the generated image (src/app/opengraph-image.tsx) is named explicitly.
const OG_IMAGE = { url: "https://www.yomushelf.com/opengraph-image", width: 1200, height: 630, alt: TITLE };

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.yomushelf.com" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://www.yomushelf.com", locale: "fr_FR", type: "website", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [OG_IMAGE] },
};

function SignupButton() {
  return (
    <Link
      href="/signup"
      className="flex min-h-12 items-center justify-center rounded-full px-7 text-base font-semibold"
      style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
    >
      Créer un compte
    </Link>
  );
}

function Rule() {
  return <span aria-hidden="true" className="block h-px w-10" style={{ background: "var(--accent)" }} />;
}

export default async function LandingPage() {
  const deck = await getLandingDeck();
  const [first, second] = deck.map((d) => ({ title: d.entry.title, cover_url: d.entry.cover_url ?? "" }));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="flex items-center gap-3 text-sm font-semibold tracking-[0.3em]">
          <span className="text-lg tracking-normal" style={{ color: "var(--accent)" }} aria-hidden="true">漫</span>
          YOMUSHELF
        </span>
        <Link href="/login" className="flex min-h-11 items-center px-2 text-sm font-medium" style={{ color: "var(--muted)" }}>
          Connexion
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-8 pb-20 sm:px-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-16">
          <div className="flex flex-col gap-7">
            <p className="eyebrow">Pour les jeunes lecteurs de manga</p>
            <h1 className="text-5xl leading-[1.02] sm:text-6xl xl:text-7xl">
              Ses mangas,
              <br />
              et où il en est<span style={{ color: "var(--accent)" }}>.</span>
            </h1>
            <Rule />
            <p className="max-w-md text-lg leading-relaxed" style={{ color: "var(--muted)" }}>
              Sa collection avec les vraies couvertures, sa lecture tome par tome, et ses prochaines envies. Assez simple pour
              qu&apos;il s&apos;en serve tout seul.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SignupButton />
              <Link href="/login" className="flex min-h-12 items-center justify-center px-4 text-sm font-medium" style={{ color: "var(--muted)" }}>
                J&apos;ai déjà un compte
              </Link>
            </div>
            <p className="text-sm" style={{ color: "var(--muted)" }}>Gratuit. Pas de pub, pas de profil public.</p>
          </div>

          {deck.length > 0 && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="eyebrow">Essaie, sans compte</p>
                <p className="font-serif text-2xl font-semibold">Ça te tente&nbsp;?</p>
              </div>
              <LandingDeck deck={deck} />
            </div>
          )}
        </section>

        <section style={{ borderTop: "1px solid var(--border)" }}>
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 sm:px-10 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col gap-4">
              <p className="eyebrow">Sa collection</p>
              <h2 className="text-3xl sm:text-4xl">Voir sa collection</h2>
              <Rule />
              <p className="max-w-md text-base leading-relaxed" style={{ color: "var(--muted)" }}>
                Toutes ses séries sur une étagère, avec les vraies couvertures. Tu vois d&apos;un coup d&apos;œil les tomes
                qu&apos;il a et ceux qui manquent. Fini le tome acheté en double.
              </p>
            </div>
            <CollectionPreview cover={first} />
          </div>
        </section>

        <section style={{ borderTop: "1px solid var(--border)" }}>
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 sm:px-10 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col gap-4 lg:order-2">
              <p className="eyebrow">Sa lecture</p>
              <h2 className="text-3xl sm:text-4xl">Suivre sa lecture</h2>
              <Rule />
              <p className="max-w-md text-base leading-relaxed" style={{ color: "var(--muted)" }}>
                Le dernier tome lu, le prochain à lire. Il le note lui-même en un geste, et tu sais où il en est sans avoir à
                demander.
              </p>
            </div>
            <div className="lg:order-1">
              <ReadingPreview cover={second} />
            </div>
          </div>
        </section>

        <section style={{ borderTop: "1px solid var(--border)" }}>
          <div className="mx-auto flex max-w-xl flex-col items-center gap-6 px-6 py-24 text-center">
            <p className="eyebrow">Pour commencer</p>
            <h2 className="text-3xl sm:text-4xl">
              Une série suffit<span style={{ color: "var(--accent)" }}>.</span>
            </h2>
            <p className="text-base" style={{ color: "var(--muted)" }}>
              Crée un compte, touche les couvertures de ce qu&apos;il lit. Le reste suit.
            </p>
            <SignupButton />
            <p className="text-sm" style={{ color: "var(--muted)" }}>Ses données restent privées.</p>
          </div>
        </section>
      </main>

      <footer
        className="flex flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row sm:px-10"
        style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}
      >
        <span className="text-xs font-semibold tracking-[0.3em]">YOMUSHELF</span>
        <nav className="flex flex-wrap items-center justify-center gap-4 text-xs" aria-label="Informations légales">
          <Link href="/mentions-legales" className="flex min-h-11 items-center">Mentions légales</Link>
          <Link href="/confidentialite" className="flex min-h-11 items-center">Confidentialité</Link>
        </nav>
        <p className="text-xs">© {new Date().getFullYear()} Yomushelf</p>
      </footer>
    </div>
  );
}
