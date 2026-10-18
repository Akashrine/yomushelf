import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  robots: { index: false },
};

export default function ConfidentialitePage() {
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

        <h1 className="mb-3 text-4xl sm:text-5xl">Politique de confidentialité</h1>
        <p className="text-sm mb-10" style={{ color: "var(--muted)" }}>Dernière mise à jour : avril 2026</p>

        <div className="manga-panel flex flex-col gap-8 rounded-3xl p-5 text-[0.95rem] leading-relaxed sm:p-8" style={{ color: "var(--foreground)" }}>
          <section>
            <h2 className="mb-3 text-2xl" style={{ color: "var(--ink)" }}>Données collectées</h2>
            <p>
              Lors de l&apos;inscription sur la liste d&apos;attente, Yomushelf collecte uniquement votre adresse email.
              Aucune autre donnée personnelle n&apos;est demandée à ce stade.
            </p>
            <p className="mt-2">
              Lors de la création d&apos;un compte (après lancement), sont également collectés : nom d&apos;utilisateur,
              données de collection manga (titres, tomes, statut de lecture). Ces données sont fournies volontairement.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl" style={{ color: "var(--ink)" }}>Finalité du traitement</h2>
            <ul className="flex flex-col gap-1.5 list-disc list-inside">
              <li>Vous informer de l&apos;ouverture de Yomushelf au public</li>
              <li>Gérer votre compte et votre collection (après lancement)</li>
              <li>Améliorer le service (analytics anonymes)</li>
            </ul>
            <p className="mt-2">
              Votre email ne sera jamais utilisé à des fins publicitaires ni cédé à des tiers.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl" style={{ color: "var(--ink)" }}>Durée de conservation</h2>
            <p>
              Les adresses email de la liste d&apos;attente sont conservées jusqu&apos;au lancement de l&apos;application,
              puis supprimées dans les 30 jours suivants, sauf si vous avez créé un compte.
            </p>
            <p className="mt-2">
              Les données de compte sont conservées tant que votre compte est actif.
              Elles sont supprimées dans les 30 jours suivant une demande de suppression.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl" style={{ color: "var(--ink)" }}>Hébergement des données</h2>
            <p>
              Les données sont stockées sur des serveurs Supabase situés dans l&apos;Union Européenne (région Irlande),
              conformément au RGPD.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl" style={{ color: "var(--ink)" }}>Vos droits</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="flex flex-col gap-1.5 list-disc list-inside mt-2">
              <li><strong style={{ color: "var(--ink)" }}>Accès</strong> : obtenir une copie de vos données</li>
              <li><strong style={{ color: "var(--ink)" }}>Rectification</strong> : corriger des données inexactes</li>
              <li><strong style={{ color: "var(--ink)" }}>Suppression</strong> : demander l&apos;effacement de vos données</li>
              <li><strong style={{ color: "var(--ink)" }}>Opposition</strong> : vous opposer au traitement de vos données</li>
            </ul>
            <p className="mt-3">
              Pour exercer ces droits, contactez-nous à :{" "}
              <a href="mailto:julien@yomushelf.com" className="font-semibold underline decoration-2 underline-offset-2" style={{ color: "var(--accent)" }}>julien@yomushelf.com</a>.
              Nous répondons dans un délai maximum de 30 jours.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl" style={{ color: "var(--ink)" }}>Cookies et analytics</h2>
            <p>
              Yomushelf ne dépose aucun cookie publicitaire ni de suivi, et n&apos;utilise pas Google Analytics.
            </p>
            <p className="mt-3">
              Pour savoir ce qui marche, on compte des gestes dans l&apos;app (par exemple « une série ajoutée », « une
              carte passée »), avec la page, le type d&apos;appareil (mobile ou ordinateur) et le site d&apos;où vient la
              visite (TikTok, Instagram, Google…). Jamais de texte tapé, jamais le titre d&apos;une recherche, jamais
              d&apos;adresse IP. Pour un visiteur sans compte, rien ne permet de le reconnaître d&apos;une visite à
              l&apos;autre : le site d&apos;origine est gardé dans l&apos;onglet le temps de la visite, puis effacé. Pour
              un compte, ces gestes sont rattachés au compte, restent sur nos serveurs en Europe, et sont détachés du
              compte (donc anonymes) quand il est supprimé.
            </p>
            <p className="mt-3">
              Le nombre de pages vues est aussi mesuré par Vercel Analytics, sans cookie et sans identifier les
              visiteurs.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl" style={{ color: "var(--ink)" }}>Contact</h2>
            <p>
              Responsable du traitement : Julien Brionne<br />
              Email :{" "}
              <a href="mailto:julien@yomushelf.com" className="font-semibold underline decoration-2 underline-offset-2" style={{ color: "var(--accent)" }}>julien@yomushelf.com</a>
            </p>
            <p className="mt-2">
              Vous pouvez également introduire une réclamation auprès de la CNIL :{" "}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-2 underline-offset-2" style={{ color: "var(--accent)" }}>cnil.fr</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
