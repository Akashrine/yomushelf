import type { Metadata } from "next";
import Link from "next/link";
import { frenchDate } from "@/lib/account/gate";
import { loadSharedList } from "@/lib/server/wishlist-share";
import { LinkPageFrame } from "@/components/public/link-page-frame";
import { NOTICES, SharedWishCard, type Notice } from "@/components/liste/shared-wish-card";
import { ListNotice } from "@/components/liste/list-notice";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ etat?: string; tome?: string }> };

const PRIVATE = { robots: { index: false, follow: false }, referrer: "no-referrer" } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const list = await loadSharedList((await params).token);
  return { title: list ? `La liste de ${list.display_name}` : "Liste plus partagée", ...PRIVATE };
}

const LINK = "inline-flex min-h-11 items-center text-sm font-semibold underline decoration-2 underline-offset-4";

// The family's page : a first name and the wished volumes, without an
// account. Reading changes nothing ; "Je l'offre" and "Annuler" are POSTs.
export default async function ListePage({ params, searchParams }: Props) {
  const { token } = await params;
  const query = await searchParams;
  const list = await loadSharedList(token);

  if (!list) {
    return (
      <LinkPageFrame title="Cette liste n'est plus partagée.">
        <p>Le lien a été arrêté ou a expiré. Demande le nouveau lien à la personne qui te l&apos;a envoyé.</p>
      </LinkPageFrame>
    );
  }

  const name = list.display_name;
  const offered = list.items.filter((i) => i.reserved).length;
  const notice = query.etat && query.etat in NOTICES ? (query.etat as Notice) : null;
  // A notice about a volume no longer on the list goes above it.
  const orphan = notice && !list.items.some((i) => i.id === query.tome) ? NOTICES[notice] : null;

  return (
    <LinkPageFrame title={`La liste de ${name}`} top wide>
      {/* A relative opening a live list : the owner checking their own link does not count. */}
      {!list.owner && <PageViewTracker event="family_list_viewed" />}
      {list.owner ? (
        <p className="rounded-xl px-3 py-2 font-semibold" style={{ background: "var(--pop)", border: "2px solid var(--ink)" }}>
          C&apos;est ta liste. Ce qu&apos;on t&apos;offre reste caché, même ici : envoie ce lien à ta famille.
        </p>
      ) : (
        <p>
          Coche « Je l&apos;offre » sur le tome que tu vas offrir : les autres le verront, pour éviter les doublons. {name} ne le voit pas dans son appli.
        </p>
      )}
      {orphan && <ListNotice text={orphan.text} error={orphan.error} />}
      {list.items.length === 0 ? (
        <p className="font-bold">{name} n&apos;a pas d&apos;envie pour l&apos;instant. Repasse plus tard.</p>
      ) : (
        <>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {list.items.length} envie{list.items.length > 1 ? "s" : ""}
            {offered > 0 && !list.owner && ` · ${offered} déjà offerte${offered > 1 ? "s" : ""}`} · visible jusqu&apos;au {frenchDate(new Date(list.expires_at))}
          </p>
          <ul className="flex flex-col gap-3">
            {list.items.map((item) => (
              <SharedWishCard key={item.id} item={item} token={token} notice={query.tome === item.id ? notice : null} owner={list.owner} />
            ))}
          </ul>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Prix indicatifs. « Je l&apos;offre » ne réserve rien en librairie : c&apos;est juste pour la famille.
          </p>
        </>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <Link href="/" className={LINK}>
          Yomushelf, c&apos;est quoi ?
        </Link>
        <Link href="/confidentialite" className={LINK}>
          Confidentialité
        </Link>
      </div>
    </LinkPageFrame>
  );
}
