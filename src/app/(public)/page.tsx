import type { Metadata } from "next";
import Link from "next/link";
import { LandingDeck } from "@/components/landing/landing-deck";
import { CoverMarquee } from "@/components/landing/cover-marquee";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { getCatalogueFigures, getLandingDeck } from "@/lib/landing/covers";

export const revalidate = 60;

const TITLE = "Yomushelf : ta collec' de mangas, mode main character";
const DESCRIPTION =
  "Tous tes tomes en un coup d'œil, plus jamais de doublon, ta liste d'envies partagée en famille pour Noël et ta prochaine série en un swipe. Gratuit, sans pub, sans profil public.";
// A page-level openGraph replaces the root one, file-based image included :
// the generated image (src/app/opengraph-image.tsx) is named explicitly.
const OG_IMAGE = { url: "https://www.yomushelf.com/opengraph-image", width: 1200, height: 630, alt: TITLE };

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "https://www.yomushelf.com" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://www.yomushelf.com", locale: "fr_FR", type: "website", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [OG_IMAGE] },
};

const INK = "var(--ink)";
const POP = "var(--pop)"; // sticker yellow, always with ink text
const comic = "font-[family-name:var(--font-bangers)] tracking-wide";
const thumb = (url: string) => `/_next/image?url=${encodeURIComponent(url)}&w=128&q=75`;
// Bangers has one weight : headings must not inherit the global 600 (faux bold).
const comicHeading = { fontFamily: "var(--font-bangers)", fontWeight: 400, letterSpacing: "0.025em" } as const;

function Cta({ children = "C'est parti !", big = false, position }: { children?: React.ReactNode; big?: boolean; position: "hero" | "final" }) {
  return (
    <TrackedLink
      position={position}
      href="/signup"
      className={`manga-button inline-flex items-center justify-center gap-2 rounded-2xl ${big ? "min-h-16 px-9 text-3xl" : "min-h-14 px-7 text-2xl"} ${comic}`}
      style={{ background: "var(--accent)", color: "white" }}
    >
      {children} <span aria-hidden="true">→</span>
    </TrackedLink>
  );
}

function Sticker({ children, tilt, className = "", pop = false }: { children: React.ReactNode; tilt: number; className?: string; pop?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`manga-sticker absolute rounded-xl px-3 py-1 text-xl ${comic} ${pop ? "manga-pop" : ""} ${className}`}
      style={{ background: POP, color: INK, transform: `rotate(${tilt}deg)`, ["--tilt" as string]: `${tilt}deg` }}
    >
      {children}
    </span>
  );
}

export default async function LandingPage() {
  const [deck, figures] = await Promise.all([getLandingDeck(), getCatalogueFigures()]);
  const covers = deck.flatMap((d) => (d.entry.cover_url ? [{ title: d.entry.title, url: d.entry.cover_url, total: d.entry.total_volumes, completed: d.entry.status === "completed" }] : []));

  return (
    <div className={`flex min-h-screen flex-col overflow-x-hidden`} style={{ color: INK }}>
      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-10">
        <span className={`flex items-center gap-2 text-2xl ${comic}`}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg text-lg" style={{ background: INK, color: POP }} aria-hidden="true">漫</span>
          Yomushelf
        </span>
        <Link href="/login" className="flex min-h-11 items-center rounded-full px-4 text-sm font-bold" style={{ border: `2px solid ${INK}` }}>
          Connexion
        </Link>
      </header>

      <PageViewTracker event="landing_viewed" />
      <main className="flex-1">
        {/* HERO */}
        <section className="manga-halftone relative">
          <span aria-hidden="true" className="manga-speedlines pointer-events-none absolute inset-0" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-6 sm:px-10 lg:grid-cols-[1.15fr_1fr] lg:pb-24 lg:pt-12">
            <div className="relative flex flex-col items-start gap-6">
              <p className="manga-sticker rounded-full px-4 py-1 text-sm font-black uppercase tracking-widest" style={{ background: INK, color: POP, transform: "rotate(-2deg)" }}>
                Pour les vrais lecteurs
              </p>
              <h1 className={`relative text-[3.6rem] leading-[0.92] sm:text-8xl ${comic}`} style={comicHeading}>
                Ta collec&apos;
                <br />
                de mangas,
                <br />
                <span className="relative inline-block px-2" style={{ background: "var(--accent)", color: "white", transform: "rotate(-1.5deg)" }}>
                  mode main
                </span>
                <br />
                <span className="relative inline-block px-2" style={{ background: "var(--accent)", color: "white", transform: "rotate(1deg)" }}>
                  character
                </span>
                <Sticker tilt={12} className="-right-2 -top-4 text-3xl sm:-right-16" pop>
                  ドン!
                </Sticker>
              </h1>
              <p className="max-w-md text-lg font-medium leading-relaxed">
                Tous tes tomes en un coup d&apos;œil. Plus jamais de doublon. Ta prochaine pépite en un swipe.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Cta position="hero" />
                <span className="text-sm font-bold">Gratuit · zéro pub</span>
              </div>
            </div>

            {deck.length > 0 && (
              <div className="relative flex flex-col items-center gap-4">
                <div className="manga-panel relative w-full max-w-[386px] rounded-3xl px-5 pb-5 pt-6" style={{ transform: "rotate(1deg)" }}>
                  <span
                    className={`manga-sticker absolute -top-6 left-1/2 whitespace-nowrap rounded-2xl px-4 py-1 text-2xl ${comic}`}
                    style={{ background: "white", transform: "translateX(-50%) rotate(-3deg)" }}
                  >
                    Essaie, sans compte !
                  </span>
                  <LandingDeck deck={deck} />
                </div>
                <Sticker tilt={-10} className="-left-1 bottom-10 hidden sm:block">
                  Swipe →
                </Sticker>
              </div>
            )}
          </div>
        </section>

        {/* COVERS MARQUEE */}
        {covers.length > 0 && <CoverMarquee covers={covers.map((c) => ({ title: c.title, src: thumb(c.url) }))} />}

        {/* THREE PANELS */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-10">
          <h2 className={`mb-10 text-center text-5xl sm:text-6xl ${comic}`} style={comicHeading}>
            3 cases, c&apos;est tout
          </h2>
          <ol className="grid gap-8 md:grid-cols-3">
            <Panel n={1} title="Touche tes tomes" tilt={-1.5} text="Tu as les 29 premiers ? Touche le 29, on te propose les 28 d’avant. Un « Oui » et c’est rangé.">
              <div className="grid grid-cols-5 gap-1.5" aria-hidden="true">
                {Array.from({ length: 15 }, (_, i) => (
                  <span
                    key={i}
                    className="flex aspect-2/3 items-center justify-center rounded-md text-sm font-black"
                    style={i < 11 ? { background: "var(--accent)", color: "white" } : { border: "2px dashed #5b6170", color: "#5b6170" }}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </Panel>
            <Panel n={2} title="Swipe tes envies" tilt={1.2} text="Une série à la fois. Tu la veux ? Glisse à droite. Pas ton délire ? À gauche.">
              <div className="flex items-center justify-center gap-3" aria-hidden="true">
                <span className="manga-sticker whitespace-nowrap rounded-2xl px-4 py-3 text-lg font-black" style={{ background: "white" }}>✕ Bof</span>
                <span className="manga-sticker whitespace-nowrap rounded-2xl px-4 py-3 text-lg font-black" style={{ background: POP, transform: "rotate(-4deg)" }}>★ Je le veux !</span>
              </div>
            </Panel>
            <Panel n={3} title="Flex ta collec'" tilt={-0.8} text="Combien de tomes, ce qui manque, les séries complètes. Ton étagère, version boss final.">
              <div className="flex items-end justify-center gap-2" aria-hidden="true">
                {covers.slice(0, 3).map((c, i) => (
                  <span key={c.url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element -- already resized by the image optimizer */}
                    <img src={thumb(c.url)} alt="" width={64} height={96} loading="lazy" decoding="async" className="h-24 w-16 rounded-md object-cover" style={{ border: `2px solid ${INK}` }} />
                    <span className="absolute -bottom-2 -right-2 rounded-full px-1.5 text-xs font-black text-white" style={{ background: i === 0 && c.completed ? "var(--success)" : INK }}>
                      {badge(c, i)}
                    </span>
                  </span>
                ))}
              </div>
            </Panel>
          </ol>
        </section>

        {/* CHRISTMAS LIST */}
        <section className="manga-halftone px-5 py-20 sm:px-10" style={{ borderTop: `3px solid ${INK}`, borderBottom: `3px solid ${INK}` }}>
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
            <div className="flex flex-col items-start gap-4">
              <p className="manga-sticker rounded-full px-4 py-1 text-sm font-black uppercase tracking-widest" style={{ background: INK, color: POP, transform: "rotate(-2deg)" }}>
                Nouveau
              </p>
              <h2 className={`text-5xl leading-none sm:text-6xl ${comic}`} style={comicHeading}>
                Ta liste de Noël,
                <br />
                sans doublon sous le sapin
              </h2>
              <ul className="flex max-w-lg flex-col gap-2 text-lg font-medium leading-relaxed">
                <li>Tes envies, avec le tome et son prix indicatif quand on le connaît, dans un lien à envoyer à ta famille.</li>
                <li>Chacun coche ce qu&apos;il offre. Les autres le voient, toi non : la surprise tient.</li>
                <li>Sans compte pour la famille. Le lien s&apos;arrête tout seul fin janvier, ou avant si tu veux.</li>
              </ul>
              <p className="text-sm font-bold" style={{ color: "#3d4352" }}>Moins de 15 ans ? C&apos;est ton parent qui envoie la liste, depuis son email, et qui peut l&apos;arrêter.</p>
            </div>
            {deck.length >= 3 && (
              <div aria-hidden="true" className="manga-panel mx-auto flex w-full max-w-[420px] flex-col gap-3 rounded-3xl p-5" style={{ transform: "rotate(1deg)" }}>
                <p className={`text-3xl ${comic}`} style={comicHeading}>La liste de Léo</p>
                {deck.slice(0, 3).map((d, i) => (
                  <div key={d.entry.id} className="flex items-center gap-3 rounded-2xl p-2" style={{ border: `2px solid ${INK}`, background: "var(--surface)" }}>
                    {d.entry.cover_url && (
                      /* eslint-disable-next-line @next/next/no-img-element -- already resized by the image optimizer */
                      <img src={thumb(d.entry.cover_url)} alt="" width={44} height={66} loading="lazy" decoding="async" className="h-16 w-11 rounded-md object-cover" style={{ border: `2px solid ${INK}` }} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{d.entry.title}</span>
                      <span className="text-sm" style={{ color: "#3d4352" }}>Tome {[4, 2, 7][i]}</span>
                    </span>
                    {i === 1 ? (
                      <span className="rounded-xl px-3 py-2 text-sm font-black" style={{ background: "var(--surface-raised)", color: "#3d4352", border: "2px dashed #5b6170" }}>Déjà offert</span>
                    ) : (
                      <span className="manga-button rounded-xl px-3 py-2 text-sm font-black" style={{ background: "var(--accent)", color: "white" }}>Je l&apos;offre</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* AND ALSO */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-10">
          <h2 className={`mb-10 text-center text-5xl sm:text-6xl ${comic}`} style={comicHeading}>
            Et aussi
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2">
            <Feature title="Des idées qui te ressemblent">
              {figures ? `${figures.series} séries choisies, dont ${figures.verifiedAge} avec l'âge conseillé par la BnF. ` : "Des séries choisies, avec l'âge conseillé par la BnF quand il existe. "}
              Des suggestions proches de celles que tu aimes, jamais ce que tu as déjà.
            </Feature>
            <Feature title="À lire chez toi">Les tomes que tu as mais pas encore lus, série par série. Tes lectures d&apos;avant se notent d&apos;un coup : « lu jusqu&apos;au tome 12 ».</Feature>
            <Feature title="Ton univers">Ta carte des goûts, tes tomes lus mois par mois, ce que tu as dépensé et ce que coûteraient tes envies.</Feature>
            <Feature title="Ta liste d'envies">Le tome exact que tu veux, et celui à trouver en premier. Acheté ou offert : un geste, et il rejoint ton étagère.</Feature>
          </ul>
        </section>

        {/* PARENTS */}
        <section className="px-5 pb-20 sm:px-10">
          <div className="manga-panel mx-auto flex max-w-3xl flex-col gap-5 rounded-3xl p-6 sm:p-8" style={{ transform: "rotate(-0.5deg)" }}>
            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: "var(--accent)" }}>Côté parents</h2>
              <p className="text-xl font-bold leading-snug">Gratuit. Pas de pub. Pas de profil public, pas de messages entre inconnus.</p>
            </div>
            <dl className="flex flex-col gap-4 text-base leading-relaxed">
              <Qa q="Mon enfant a moins de 15 ans ?">Il te donne ton email à l&apos;inscription. Tu reçois un lien pour accepter ou refuser. Sans ton accord, l&apos;appli reste fermée, et le compte est supprimé au bout de 14 jours.</Qa>
              <Qa q="Qui voit sa collection ?">Personne d&apos;autre que lui. Sous 15 ans, sa liste de Noël ne part que par le lien que tu crées, et tu peux l&apos;arrêter quand tu veux. Dès 15 ans, c&apos;est lui qui la partage.</Qa>
              <Qa q="Quels mangas lui sont proposés ?">Sous 15 ans, Découvrir et les suggestions ne proposent que des séries dont l&apos;âge est conseillé par la sélection jeunesse de la BnF (CNLJ). La recherche reste ouverte, sans contenu adulte.</Qa>
              <Qa q="Et les données ?">Stockées en Europe. La mesure d&apos;audience est anonyme et sans cookie. Rien n&apos;est vendu, rien ne sert à la pub.</Qa>
            </dl>
            <Link href="/confidentialite" className="self-start text-sm font-bold underline decoration-2 underline-offset-4">Tout sur la confidentialité</Link>
          </div>
        </section>

        {/* FINAL */}
        <section className="manga-halftone relative overflow-hidden" style={{ borderTop: `3px solid ${INK}` }}>
          <span aria-hidden="true" className="manga-speedlines pointer-events-none absolute inset-0" />
          <div className="relative mx-auto flex max-w-xl flex-col items-center gap-6 px-5 py-24 text-center">
            <h2 className={`text-6xl leading-none sm:text-7xl ${comic}`} style={comicHeading}>
              À toi de jouer !
            </h2>
            <p className="text-lg font-medium">Une série suffit pour commencer.</p>
            <Cta big position="final">Créer mon compte</Cta>
          </div>
        </section>
      </main>

      <footer className="flex flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row sm:px-10" style={{ background: INK, color: "#e9e4da" }}>
        <span className={`text-xl ${comic}`}>Yomushelf</span>
        <nav className="flex flex-wrap items-center justify-center gap-4 text-xs" aria-label="Informations légales">
          <Link href="/mentions-legales" className="flex min-h-11 items-center">Mentions légales</Link>
          <Link href="/confidentialite" className="flex min-h-11 items-center">Confidentialité</Link>
        </nav>
        <p className="text-xs">© {new Date().getFullYear()} Yomushelf</p>
      </footer>
    </div>
  );
}

// Example progress on real series : the first one complete when the series
// is finished, the others part of the way, never more than what exists.
function badge(c: { total: number | null; completed: boolean }, i: number) {
  if (!c.total) return i === 0 ? "✓" : `${[12, 5][i - 1] ?? 3} tomes`;
  if (i === 0 && c.completed) return `✓ ${c.total}/${c.total}`;
  return `${Math.max(1, Math.round(c.total * [0.9, 0.5, 0.3][i]))}/${c.total}`;
}

function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="manga-panel flex flex-col gap-2 rounded-2xl p-5">
      <h3 className={`text-3xl ${comic}`} style={comicHeading}>
        {title}
      </h3>
      <p className="text-base leading-relaxed">{children}</p>
    </li>
  );
}

function Qa({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-bold">{q}</dt>
      <dd style={{ color: "#3d4352" }}>{children}</dd>
    </div>
  );
}

function Panel({ n, title, text, tilt, children }: { n: number; title: string; text: string; tilt: number; children: React.ReactNode }) {
  return (
    <li className="manga-panel relative flex flex-col gap-4 rounded-2xl p-5 pt-7" style={{ transform: `rotate(${tilt}deg)` }}>
      <span
        className={`absolute -left-3 -top-4 flex h-11 w-11 items-center justify-center rounded-full text-2xl ${comic}`}
        style={{ background: INK, color: POP }}
        aria-hidden="true"
      >
        {n}
      </span>
      <h3 className={`text-3xl ${comic}`} style={comicHeading}>
        {title}
      </h3>
      {children}
      <p className="text-base leading-relaxed">{text}</p>
    </li>
  );
}
