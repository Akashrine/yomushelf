import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  robots: { index: false },
};

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-sm mb-10 inline-block transition-opacity hover:opacity-70" style={{ color: "var(--muted)" }}>
          ← Retour
        </Link>

        <h1 className="text-2xl font-bold mb-2">Politique de confidentialité</h1>
        <p className="text-sm mb-10" style={{ color: "var(--muted)" }}>Dernière mise à jour : avril 2026</p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--foreground)" }}>Données collectées</h2>
            <p>
              Lors de l'inscription sur la liste d'attente, Yomushelf collecte uniquement votre adresse email.
              Aucune autre donnée personnelle n'est demandée à ce stade.
            </p>
            <p className="mt-2">
              Lors de la création d'un compte (après lancement), sont également collectés : nom d'utilisateur,
              données de collection manga (titres, tomes, statut de lecture). Ces données sont fournies volontairement.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--foreground)" }}>Finalité du traitement</h2>
            <ul className="flex flex-col gap-1.5 list-disc list-inside">
              <li>Vous informer de l'ouverture de Yomushelf au public</li>
              <li>Gérer votre compte et votre collection (après lancement)</li>
              <li>Améliorer le service (analytics anonymes)</li>
            </ul>
            <p className="mt-2">
              Votre email ne sera jamais utilisé à des fins publicitaires ni cédé à des tiers.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--foreground)" }}>Durée de conservation</h2>
            <p>
              Les adresses email de la liste d'attente sont conservées jusqu'au lancement de l'application,
              puis supprimées dans les 30 jours suivants, sauf si vous avez créé un compte.
            </p>
            <p className="mt-2">
              Les données de compte sont conservées tant que votre compte est actif.
              Elles sont supprimées dans les 30 jours suivant une demande de suppression.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--foreground)" }}>Hébergement des données</h2>
            <p>
              Les données sont stockées sur des serveurs Supabase situés dans l'Union Européenne (région Irlande),
              conformément au RGPD.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--foreground)" }}>Vos droits</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="flex flex-col gap-1.5 list-disc list-inside mt-2">
              <li><strong style={{ color: "var(--foreground)" }}>Accès</strong> : obtenir une copie de vos données</li>
              <li><strong style={{ color: "var(--foreground)" }}>Rectification</strong> : corriger des données inexactes</li>
              <li><strong style={{ color: "var(--foreground)" }}>Suppression</strong> : demander l'effacement de vos données</li>
              <li><strong style={{ color: "var(--foreground)" }}>Opposition</strong> : vous opposer au traitement de vos données</li>
            </ul>
            <p className="mt-3">
              Pour exercer ces droits, contactez-nous à :{" "}
              <a href="mailto:julien@yomushelf.com" className="underline" style={{ color: "var(--accent)" }}>julien@yomushelf.com</a>.
              Nous répondons dans un délai maximum de 30 jours.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--foreground)" }}>Cookies et analytics</h2>
            <p>
              Yomushelf utilise des outils d'analyse anonymes (Vercel Analytics) pour mesurer le trafic.
              Ces outils ne déposent pas de cookies de tracking et ne permettent pas d'identifier personnellement
              les visiteurs.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--foreground)" }}>Contact</h2>
            <p>
              Responsable du traitement : Julien Brionne<br />
              Email :{" "}
              <a href="mailto:julien@yomushelf.com" className="underline" style={{ color: "var(--accent)" }}>julien@yomushelf.com</a>
            </p>
            <p className="mt-2">
              Vous pouvez également introduire une réclamation auprès de la CNIL :{" "}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--accent)" }}>cnil.fr</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
