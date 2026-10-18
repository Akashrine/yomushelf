import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions légales",
  robots: { index: false },
};

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--ink)" }}>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="manga-panel-sm manga-press mb-10 inline-flex min-h-11 items-center gap-1.5 rounded-2xl px-4 text-sm font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          style={{ background: "var(--surface)", color: "var(--ink)" }}
        >
          <span aria-hidden="true">←</span> Retour
        </Link>

        <h1 className="mb-10 text-4xl sm:text-5xl">Mentions légales</h1>

        <div className="manga-panel flex flex-col gap-8 rounded-3xl p-5 text-[0.95rem] leading-relaxed sm:p-8" style={{ color: "var(--foreground)" }}>
          <section>
            <h2 className="mb-3 text-2xl" style={{ color: "var(--ink)" }}>Éditeur du site</h2>
            <p>Yomushelf est un projet personnel édité par :</p>
            <p className="mt-2">
              Julien Brionne<br />
              Contact : <a href="mailto:julien@yomushelf.com" className="font-semibold underline decoration-2 underline-offset-2" style={{ color: "var(--accent)" }}>julien@yomushelf.com</a>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl" style={{ color: "var(--ink)" }}>Hébergement</h2>
            <p>
              Ce site est hébergé par Vercel Inc.<br />
              440 N Barranca Ave #4133, Covina, CA 91723, États-Unis<br />
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-2 underline-offset-2" style={{ color: "var(--accent)" }}>vercel.com</a>
            </p>
            <p className="mt-2">
              La base de données est hébergée par Supabase sur des serveurs situés dans l&apos;Union Européenne (région Irlande).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl" style={{ color: "var(--ink)" }}>Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble du contenu de ce site (textes, interface, logo) est la propriété de Yomushelf.
              Toute reproduction, même partielle, est interdite sans autorisation préalable.
            </p>
            <p className="mt-2">
              Les noms et couvertures de mangas mentionnés appartiennent à leurs éditeurs et auteurs respectifs.
              Yomushelf n&apos;est affilié à aucun éditeur manga.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl" style={{ color: "var(--ink)" }}>Responsabilité</h2>
            <p>
              Yomushelf s&apos;efforce de fournir des informations exactes. Toutefois, aucune garantie n&apos;est donnée
              quant à l&apos;exactitude ou l&apos;exhaustivité des données (prix, nombre de tomes, dates de sortie).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl" style={{ color: "var(--ink)" }}>Contact</h2>
            <p>
              Pour toute question relative au site :{" "}
              <a href="mailto:julien@yomushelf.com" className="font-semibold underline decoration-2 underline-offset-2" style={{ color: "var(--accent)" }}>julien@yomushelf.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
