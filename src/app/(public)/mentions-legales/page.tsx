import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions légales",
  robots: { index: false },
};

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-sm mb-10 inline-block transition-opacity hover:opacity-70" style={{ color: "var(--muted)" }}>
          ← Retour
        </Link>

        <h1 className="text-2xl font-bold mb-10">Mentions légales</h1>

        <div className="flex flex-col gap-8 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--foreground)" }}>Éditeur du site</h2>
            <p>Yomushelf est un projet personnel édité par :</p>
            <p className="mt-2">
              Julien Brionne<br />
              Contact : <a href="mailto:julien@yomushelf.com" className="underline" style={{ color: "var(--accent)" }}>julien@yomushelf.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--foreground)" }}>Hébergement</h2>
            <p>
              Ce site est hébergé par Vercel Inc.<br />
              440 N Barranca Ave #4133, Covina, CA 91723, États-Unis<br />
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--accent)" }}>vercel.com</a>
            </p>
            <p className="mt-2">
              La base de données est hébergée par Supabase sur des serveurs situés dans l'Union Européenne (région Irlande).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--foreground)" }}>Propriété intellectuelle</h2>
            <p>
              L'ensemble du contenu de ce site (textes, interface, logo) est la propriété de Yomushelf.
              Toute reproduction, même partielle, est interdite sans autorisation préalable.
            </p>
            <p className="mt-2">
              Les noms et couvertures de mangas mentionnés appartiennent à leurs éditeurs et auteurs respectifs.
              Yomushelf n'est affilié à aucun éditeur manga.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--foreground)" }}>Responsabilité</h2>
            <p>
              Yomushelf s'efforce de fournir des informations exactes. Toutefois, aucune garantie n'est donnée
              quant à l'exactitude ou l'exhaustivité des données (prix, nombre de tomes, dates de sortie).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--foreground)" }}>Contact</h2>
            <p>
              Pour toute question relative au site :{" "}
              <a href="mailto:julien@yomushelf.com" className="underline" style={{ color: "var(--accent)" }}>julien@yomushelf.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
