import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AGE_PAGES, ageFromSlug, agePageSlug, loadPublicSeries, seriesForAge } from "@/lib/catalogue/public-series";

export const revalidate = 3600;

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.yomushelf.com").trim();
const optimized = (url: string) => `/_next/image?url=${encodeURIComponent(url)}&w=256&q=75`;

export function generateStaticParams() {
  return AGE_PAGES.map((a) => ({ age: agePageSlug(a) }));
}

export async function generateMetadata({ params }: { params: Promise<{ age: string }> }): Promise<Metadata> {
  const age = ageFromSlug((await params).age);
  if (age == null) return { robots: { index: false } };
  const description = `Les mangas à offrir ou à lire dès ${age} ans, d'après la sélection de la Centrale nationale de la jeunesse (CNLJ, BnF). Âge vérifié, éditeur, nombre de tomes.`;
  const url = `${APP_URL}/manga/${agePageSlug(age)}`;
  return {
    title: `Manga dès ${age} ans : notre sélection`,
    description,
    alternates: { canonical: url },
    openGraph: { title: `Manga dès ${age} ans`, description, url, locale: "fr_FR", type: "website" },
  };
}

export default async function AgePage({ params }: { params: Promise<{ age: string }> }) {
  const age = ageFromSlug((await params).age);
  if (age == null) notFound();
  const list = seriesForAge(await loadPublicSeries(), age);
  if (list.length === 0) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Manga dès ${age} ans`,
    itemListElement: list.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: `${APP_URL}/serie/${s.slug}`, name: s.title })),
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--ink)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="manga-panel-sm manga-press mb-8 inline-flex min-h-11 items-center gap-1.5 rounded-2xl px-4 text-sm font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          style={{ background: "var(--surface)", color: "var(--ink)" }}
        >
          <span aria-hidden="true">←</span> Yomushelf
        </Link>

        <h1 className="mb-3 text-4xl sm:text-5xl">Manga dès {age} ans</h1>
        <p className="mb-8 max-w-2xl text-base leading-relaxed">
          {list.length} séries recommandées dès {age} ans ou moins par la sélection de la CNLJ (Centrale nationale de la jeunesse, BnF). C&apos;est une indication, pas une classification officielle : tu connais ton enfant.
        </p>

        <nav aria-label="Autres âges" className="mb-8 flex flex-wrap gap-2">
          {AGE_PAGES.map((a) => (
            <Link
              key={a}
              href={`/manga/${agePageSlug(a)}`}
              aria-current={a === age ? "page" : undefined}
              className="manga-panel-sm manga-press inline-flex min-h-11 items-center rounded-2xl px-4 text-sm font-bold"
              style={{ background: a === age ? "var(--pop)" : "var(--surface)", color: "var(--ink)" }}
            >
              Dès {a} ans
            </Link>
          ))}
        </nav>

        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {list.map((s, i) => (
            <li key={s.id}>
              <Link href={`/serie/${s.slug}`} className="flex flex-col gap-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
                {s.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={optimized(s.cover_url)} alt="" width={128} height={192} loading={i < 4 ? "eager" : "lazy"} className="manga-panel-sm h-auto w-full rounded-xl" />
                )}
                <span className="text-sm font-bold">{s.title}</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>dès {s.audience_min_age} ans{s.total_volumes ? ` · ${s.total_volumes} tomes` : ""}</span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/signup"
          className="manga-button mt-10 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-7 text-lg font-bold"
          style={{ background: "var(--accent)", color: "white" }}
        >
          Ranger sa collection <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
