import type { Metadata } from "next";
import Link from "next/link";
import { frenchDate } from "@/lib/account/gate";
import { loadParentLink } from "@/lib/server/wishlist-share";
import { defaultShareExpiry, isActiveShare } from "@/lib/wishlist/share";
import { LinkPageFrame } from "@/components/public/link-page-frame";
import { ShareLinkForm } from "@/components/envies/share-link-form";
import { parentShareList, parentStopShare } from "../actions";

export const metadata: Metadata = {
  title: "Liste d'envies à partager",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const LINK = "inline-flex min-h-11 items-center text-sm font-semibold underline decoration-2 underline-offset-4";
const STOP =
  "manga-panel-sm manga-press flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-base font-bold focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink)]";

type Params = { arreter?: string; arrete?: string; erreur?: string };

// The page a parent opens from "Envoyer ma liste à ma famille" (child
// under 15). Reading it changes nothing ; each action is a button (POST).
export default async function FamillePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Params> }) {
  const { token } = await params;
  const query = await searchParams;
  const parent = await loadParentLink(token);

  if (!parent) {
    return (
      <LinkPageFrame title="Ce lien n'est plus valable.">
        <p>Il a expiré, ou un email plus récent t&apos;a été envoyé : utilise le dernier reçu. Ton enfant peut aussi te renvoyer sa liste depuis l&apos;app.</p>
      </LinkPageFrame>
    );
  }

  const who = parent.username ? `Ton enfant (pseudo « ${parent.username} »)` : "Ton enfant";
  const active = isActiveShare(parent.share);
  const error = query.erreur === "1" && (
    <p role="alert" className="rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: "#fbeceb", color: "var(--danger)", border: "2px solid var(--danger)" }}>
      Le partage n&apos;a pas pu être arrêté. Réessaie dans quelques minutes.
    </p>
  );

  if (active && query.arreter === "1") {
    return (
      <LinkPageFrame title="Arrêter le partage ?">
        <p>Le lien ne marchera plus : la famille ne verra plus la liste. Tu pourras en créer un nouveau.</p>
        <form action={parentStopShare}>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className={STOP} style={{ background: "var(--danger)", color: "white" }}>
            Arrêter le partage
          </button>
        </form>
        <Link href={`/famille/${token}`} className={LINK}>
          Annuler
        </Link>
      </LinkPageFrame>
    );
  }

  if (active && parent.share) {
    return (
      <LinkPageFrame title="La liste est partagée.">
        {error}
        <p>
          Le lien de la liste de {parent.share.display_name} marche jusqu&apos;au {frenchDate(new Date(parent.share.expires_at))}.
        </p>
        <p>Perdu, ou envoyé à la mauvaise personne ? Crée un nouveau lien : l&apos;ancien ne marchera plus, ce qui est déjà coché « Je l&apos;offre » reste coché.</p>
        <ShareLinkForm
          action={parentShareList}
          token={token}
          defaultName={parent.share.display_name}
          submitLabel="Créer un nouveau lien"
          afterText="Une copie t'a été envoyée par email."
          notSentText="Pas de copie par email cette fois : garde ce lien."
        />
        <Link href={`/famille/${token}?arreter=1`} className={LINK}>
          Arrêter le partage
        </Link>
      </LinkPageFrame>
    );
  }

  return (
    <LinkPageFrame title={query.arrete === "1" ? "Le partage est arrêté." : "Partager sa liste d'envies."}>
      {query.arrete === "1" ? (
        <p>Le lien ne marche plus. Tu peux en créer un nouveau quand tu veux.</p>
      ) : (
        <>
          <p>{who}{" "}aimerait envoyer sa liste de mangas à la famille. Avant 15 ans, c&apos;est toi qui partages.</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>La famille voit le prénom choisi ci-dessous et les tomes souhaités. Rien d&apos;autre.</li>
            <li>Elle peut cocher « Je l&apos;offre » pour éviter les doublons. Ton enfant ne le voit pas.</li>
            <li>Le lien s&apos;arrête seul le {frenchDate(defaultShareExpiry(new Date()))}, et tu peux l&apos;arrêter avant ici.</li>
          </ul>
        </>
      )}
      <ShareLinkForm
        action={parentShareList}
        token={token}
        defaultName={parent.username ?? ""}
        submitLabel="Créer le lien"
        afterText="Une copie t'a été envoyée par email."
          notSentText="Pas de copie par email cette fois : garde ce lien."
      />
      <Link href="/confidentialite" className={LINK}>
        Confidentialité
      </Link>
    </LinkPageFrame>
  );
}
