import type { Metadata } from "next";
import Link from "next/link";
import { MeasurementToggle } from "@/components/analytics/measurement-toggle";

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
        <p className="text-sm mb-10" style={{ color: "var(--muted)" }}>Dernière mise à jour : octobre 2026</p>

        <div className="manga-panel flex flex-col gap-8 rounded-3xl p-5 text-[0.95rem] leading-relaxed sm:p-8" style={{ color: "var(--foreground)" }}>
          <section>
            <h2 className="mb-3 text-2xl" style={{ color: "var(--ink)" }}>Données collectées</h2>
            <p>
              Lors de la création d&apos;un compte sont collectés : email, pseudo (facultatif), tranche d&apos;âge
              (moins de 15 ans ou 15 ans et plus, jamais la date de naissance), la façon dont tu as connu Yomushelf,
              et les données de collection manga (séries, tomes, lectures, envies). Ces données sont fournies volontairement.
            </p>
            <p className="mt-2">
              Pour un compte de moins de 15 ans, on collecte aussi l&apos;email d&apos;un parent, pour lui demander son accord.
            </p>
            <p className="mt-2">
              Si tu partages ta liste de Noël (voir plus bas), on garde le prénom que tu choisis d&apos;afficher et un
              lien secret. Les personnes qui ouvrent le lien n&apos;ont pas de compte : on ne garde ni leur nom, ni leur
              adresse IP.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl" style={{ color: "var(--ink)" }}>Finalité du traitement</h2>
            <ul className="flex flex-col gap-1.5 list-disc list-inside">
              <li>Gérer votre compte et votre collection</li>
              <li>Partager ta liste de Noël avec ta famille, seulement si tu le décides (ou si ton parent le décide pour toi)</li>
              <li>Demander l&apos;accord d&apos;un parent pour un compte de moins de 15 ans</li>
              <li>Améliorer le service (mesure d&apos;audience anonyme, voir plus bas)</li>
            </ul>
            <p className="mt-2">
              Votre email ne sera jamais utilisé à des fins publicitaires ni vendu. Il passe seulement par les prestataires
              listés plus bas, pour l&apos;envoi des emails du service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl" style={{ color: "var(--ink)" }}>Durée de conservation</h2>
            <p>
              Les données de compte sont conservées tant que votre compte est actif.
              Elles sont supprimées dans les 30 jours suivant une demande de suppression.
            </p>
            <ul className="mt-2 flex list-inside list-disc flex-col gap-1.5">
              <li>
                <strong style={{ color: "var(--ink)" }}>Lien de la liste de Noël</strong> : jusqu&apos;au 31 janvier par
                défaut, ou jusqu&apos;à ce que tu l&apos;arrêtes. Il est effacé 30 jours plus tard, avec les « Je
                l&apos;offre » de ta famille.
              </li>
              <li>
                <strong style={{ color: "var(--ink)" }}>Lien envoyé à un parent</strong> : effacé 30 jours après son
                expiration.
              </li>
              <li>
                <strong style={{ color: "var(--ink)" }}>Journal des emails envoyés</strong> (il sert seulement à limiter
                les envois) : 2 jours.
              </li>
              <li>
                <strong style={{ color: "var(--ink)" }}>Mesure d&apos;audience</strong> : 13 mois.
              </li>
              <li>Si tu supprimes ton compte, ta liste, son lien et les « Je l&apos;offre » partent avec.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl" style={{ color: "var(--ink)" }}>Moins de 15 ans</h2>
            <p>
              En France, avant 15 ans, l&apos;utilisation d&apos;un service comme Yomushelf demande l&apos;accord d&apos;un
              parent (article 45 de la loi Informatique et Libertés). Après l&apos;inscription, on demande donc la tranche
              d&apos;âge. Sous 15 ans, le compte reste fermé tant qu&apos;un parent n&apos;a pas dit oui depuis le lien reçu
              par email.
            </p>
            <ul className="mt-2 flex list-inside list-disc flex-col gap-1.5">
              <li>Sans accord au bout de 14 jours, le compte et ses données sont supprimés automatiquement.</li>
              <li>L&apos;email du parent sert uniquement à cet accord et à lui écrire au sujet du compte. Jamais de pub.</li>
              <li>Un compte de moins de 15 ans ne se voit proposer, dans Découvrir et dans la recherche d&apos;ajout, que des séries recommandées pour la jeunesse par le CNLJ (BnF). Il peut aussi écrire lui-même une fiche, mais aucune recherche ne part vers un service extérieur.</li>
              <li>Sa liste de Noël n&apos;est jamais partagée par lui : c&apos;est son parent qui crée le lien, depuis l&apos;email reçu.</li>
              <li>Aucun compte n&apos;a de profil public : toutes les bibliothèques sont privées.</li>
              <li>Le parent peut retirer son accord à tout moment avec le même lien : le compte est alors supprimé.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl" style={{ color: "var(--ink)" }}>Ta liste de Noël</h2>
            <p>
              Tu peux envoyer tes envies à ta famille avec un lien. Ce qu&apos;ils voient : ton prénom (celui que tu as
              choisi), tes envies avec le tome, un prix indicatif quand on le connaît, et ce que les autres ont déjà
              coché. Rien d&apos;autre : ni ta collection, ni ton email, ni ton pseudo.
            </p>
            <ul className="mt-2 flex list-inside list-disc flex-col gap-1.5">
              <li>Le lien est un code secret. Il n&apos;est pas indexé par les moteurs de recherche, et il est retiré des mesures d&apos;audience.</li>
              <li>Toi, tu ne vois jamais ce qui est offert : la surprise est gardée, même si tu ouvres ton propre lien. Sous 15 ans, ton parent peut le voir sur la liste. Personne ne voit qui a coché quoi : on ne garde pas de nom.</li>
              <li>Chacun peut annuler son « Je l&apos;offre », depuis le téléphone qui l&apos;a coché. Ce téléphone reçoit pour cela un cookie technique (voir plus bas).</li>
              <li>Tu peux arrêter le lien quand tu veux ; il s&apos;arrête aussi tout seul à sa date de fin.</li>
              <li>Sous 15 ans, seul le parent qui a donné son accord peut créer, renouveler ou arrêter le lien.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl" style={{ color: "var(--ink)" }}>Hébergement et prestataires</h2>
            <p>
              Les données sont stockées sur des serveurs Supabase situés dans l&apos;Union Européenne (région Irlande),
              conformément au RGPD. D&apos;autres services interviennent pour faire fonctionner Yomushelf :
            </p>
            <ul className="mt-2 flex list-inside list-disc flex-col gap-1.5">
              <li><strong style={{ color: "var(--ink)" }}>Vercel</strong> : hébergement du site (calculs à Paris) et comptage des pages vues, sans cookie.</li>
              <li><strong style={{ color: "var(--ink)" }}>Resend</strong> : envoi des emails (confirmation, accord d&apos;un parent, liste de Noël). Il reçoit l&apos;adresse du destinataire et le texte du message.</li>
              <li><strong style={{ color: "var(--ink)" }}>Google</strong> : connexion avec Google, si tu la choisis.</li>
              <li><strong style={{ color: "var(--ink)" }}>MyAnimeList</strong> : quand un compte de 15 ans et plus cherche une série absente du catalogue, le titre tapé lui est envoyé, sans lien avec le compte. Jamais pour un compte de moins de 15 ans.</li>
              <li><strong style={{ color: "var(--ink)" }}>Google Books</strong> et la <strong style={{ color: "var(--ink)" }}>BnF</strong> : jaquettes et numéros des tomes du catalogue. Aucune donnée de lecteur ne leur est envoyée.</li>
            </ul>
            <p className="mt-2">Rien n&apos;est vendu, et aucune donnée ne sert à de la publicité.</p>
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
              Yomushelf ne dépose aucun cookie publicitaire ni de suivi, et n&apos;utilise pas Google Analytics. Les seuls
              cookies sont techniques : ta session de connexion, et un cookie de la page de la liste de Noël
              (« yomushelf_offre », 180 jours) qui permet à un proche d&apos;annuler son propre « Je l&apos;offre ». Il
              ne contient qu&apos;un code au hasard, sans nom ni compte.
            </p>
            <p className="mt-3">
              Pour savoir ce qui marche, on compte des gestes anonymes dans l&apos;app (par exemple « une série
              ajoutée », « une carte passée »), avec la page, le type d&apos;appareil (mobile ou ordinateur) et le site
              d&apos;où vient la visite (TikTok, Instagram, Google…). Ces mesures ne sont jamais rattachées à une
              personne : ni compte, ni identifiant, ni adresse IP, ni texte tapé. Pour un compte, on garde seulement
              la semaine de création du compte, pour savoir si les nouveaux venus reviennent. Le site d&apos;origine
              est gardé dans l&apos;onglet le temps de la visite, puis effacé. Les mesures sont supprimées au bout de
              13 mois.
            </p>
            <p className="mt-3">
              Tu peux refuser ces mesures sur cet appareil, à tout moment. Elles sont aussi coupées si ton navigateur
              envoie le signal « Do Not Track » ou « Global Privacy Control ».
            </p>
            <MeasurementToggle />
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
