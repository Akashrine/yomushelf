import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { agePageOf, agePageSlug, loadNeighbourSlugs, loadPublicSeries, seriesDescription } from "@/lib/catalogue/public-series";
import { ageLabel, DEMOGRAPHIC_LABELS, GENRE_LABELS } from "@/lib/discovery/suggest";

export const revalidate = 3600;

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.yomushelf.com").trim();
const optimized = (url: string, w: number) => `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=75`;

export async function generateStaticParams() {
  return (await loadPublicSeries()).map((s) => ({ slug: s.slug }));
}

async function findSeries(slug: string) {
  const all = await loadPublicSeries();
  return { all, series: all.find((s) => s.slug === slug) };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { series } = await findSeries((await params).slug);
  if (!series) return { robots: { index: false } };
  const description = seriesDescription(series);
  const url = `${APP_URL}/serie/${series.slug}`;
  return {
    title: `${series.title} : tomes, âge conseillé, prix`,
    description,
    alternates: { canonical: url },
    // a page without a synopsis is thin : kept out of the index
    robots: series.synopsis ? undefined : { index: false },
    openGraph: { title: series.title, description, url, locale: "fr_FR", type: "website", images: series.cover_url ? [{ url: series.cover_url }] : undefined },
  };
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { all, series } = await findSeries((await params).slug);
  if (!series) notFound();
  const neighbours = await loadNeighbourSlugs(series.id, all);
  const age = series.audience_age_source === "cnlj" && series.audience_min_age != null ? ageLabel(series) : null;
  const facts: [string, string][] = [
    ...(series.author ? [["Auteur", series.author] as [string, string]] : []),
    ...(series.publisher_fr ? [["Éditeur", series.publisher_fr] as [string, string]] : []),
    ...(series.total_volumes ? [["Tomes", `${series.total_volumes}${series.status === "completed" ? " (série terminée)" : " parus"}`] as [string, string]] : []),
    ...(series.list_price_eur ? [["Prix d'un tome", `${series.list_price_eur.toFixed(2).replace(".", ",")} €`] as [string, string]] : []),
    ...(series.demographic ? [["Public", DEMOGRAPHIC_LABELS[series.demographic]] as [string, string]] : []),
    ...(series.genres.length ? [["Genres", series.genres.map((g) => GENRE_LABELS[g] ?? g).join(", ")] as [string, string]] : []),
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BookSeries",
    name: series.title,
    url: `${APP_URL}/serie/${series.slug}`,
    inLanguage: "fr",
    ...(series.author ? { author: { "@type": "Person", name: series.author } } : {}),
    ...(series.publisher_fr ? { publisher: { "@type": "Organization", name: series.publisher_fr } } : {}),
    ...(series.total_volumes ? { numberOfItems: series.total_volumes } : {}),
    ...(series.synopsis ? { description: series.synopsis } : {}),
    ...(series.cover_url ? { image: series.cover_url } : {}),
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--ink)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="manga-panel-sm manga-press mb-8 inline-flex min-h-11 items-center gap-1.5 rounded-2xl px-4 text-sm font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          style={{ background: "var(--surface)", color: "var(--ink)" }}
        >
          <span aria-hidden="true">←</span> Yomushelf
        </Link>

        <div className="flex flex-col gap-8 sm:flex-row">
          {series.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={optimized(series.cover_url, 384)}
              alt={`Couverture de ${series.title}`}
              width={192}
              height={288}
              className="manga-panel h-auto w-48 shrink-0 self-start rounded-2xl"
            />
          )}
          <div className="flex min-w-0 flex-col gap-4">
            <h1 className="text-4xl sm:text-5xl">{series.title}</h1>
            {age && (
              <p className="manga-sticker w-fit rounded-xl px-3 py-1 text-sm font-bold" style={{ background: "var(--pop)", color: "var(--ink)" }}>
                {age[0].toUpperCase() + age.slice(1)}
              </p>
            )}
            {series.synopsis && <p className="text-base leading-relaxed">{series.synopsis}</p>}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-bold" style={{ color: "var(--muted)" }}>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <Link
              href="/signup"
              className="manga-button inline-flex min-h-14 w-fit items-center justify-center gap-2 rounded-2xl px-7 text-lg font-bold"
              style={{ background: "var(--accent)", color: "white" }}
            >
              Ajouter à ma bibliothèque <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {agePageOf(series) != null && (
          <p className="mt-10 text-sm font-bold">
            <Link href={`/manga/${agePageSlug(agePageOf(series)!)}`} className="underline underline-offset-4">
              Voir tous les mangas dès {agePageOf(series)} ans
            </Link>
          </p>
        )}

        {neighbours.length > 0 && (
          <section className="mt-12" aria-labelledby="proches">
            <h2 id="proches" className="mb-4 text-3xl">Si tu aimes {series.title}</h2>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {neighbours.map((n) => (
                <li key={n.id}>
                  <Link href={`/serie/${n.slug}`} className="flex flex-col gap-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
                    {n.cover_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={optimized(n.cover_url, 256)} alt="" width={128} height={192} loading="lazy" className="manga-panel-sm h-auto w-full rounded-xl" />
                    )}
                    <span className="text-sm font-bold">{n.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
