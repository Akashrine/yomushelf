import { shareMyList } from "@/app/(app)/envies/actions";
import { AskParentButton } from "./ask-parent-button";
import { ShareLinkForm } from "./share-link-form";
import { StopShareForm } from "./stop-share-form";

export type FamilyShareStatus =
  | { kind: "reader"; activeUntil: string | null; defaultName: string; canCreate: boolean } // 15 and over
  | { kind: "child"; activeUntil: string | null; askedOn: string | null; parentEmail: string | null }; // under 15

const SURPRISE = "Ce qu'on t'offre reste une surprise : tu ne le verras pas ici.";

// "Ma liste de Noël" : what the family gives stays a surprise, so this
// panel never shows what was ticked.
export function FamilySharePanel({ status }: { status: FamilyShareStatus }) {
  const active = status.activeUntil != null;
  return (
    <section aria-labelledby="family-share-title" className="manga-panel mb-8 flex flex-col gap-3 rounded-3xl p-5 sm:p-6" style={{ color: "var(--ink)" }}>
      <h2 id="family-share-title" className="text-2xl leading-none">
        {active ? "Ta liste est partagée" : "Envoie ta liste à ta famille"}
      </h2>
      {status.kind === "child" ? <ChildPart status={status} /> : <ReaderPart status={status} />}
    </section>
  );
}

function ChildPart({ status }: { status: Extract<FamilyShareStatus, { kind: "child" }> }) {
  return (
    <>
      <p className="text-sm">
        {status.activeUntil
          ? `Ta famille voit tes envies jusqu'au ${status.activeUntil}. ${SURPRISE}`
          : status.askedOn
            ? `Email envoyé ${status.parentEmail ? `à ton parent (${status.parentEmail})` : "à ton parent"} le ${status.askedOn}. C'est lui qui crée le lien et l'envoie à la famille.`
            : `On envoie un email à ton parent : c'est lui qui partage le lien avec la famille. ${SURPRISE}`}
      </p>
      {status.activeUntil && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Pour l&apos;arrêter ou changer le lien, ton parent utilise son email. Il l&apos;a perdu ? Renvoie-le.
        </p>
      )}
      {/* Same place in every state : the confirmation survives a refresh. */}
      <AskParentButton label={status.activeUntil || status.askedOn ? "Renvoyer l'email à mon parent" : "Envoyer ma liste à ma famille"} />
    </>
  );
}

function ReaderPart({ status }: { status: Extract<FamilyShareStatus, { kind: "reader" }> }) {
  const active = status.activeUntil != null;
  // The link form keeps one key and one place : a refresh of the page
  // (another action on this screen) must not unmount the link shown once.
  return [
    <p key="status" className="text-sm">
      {active
        ? `Ta famille voit tes envies jusqu'au ${status.activeUntil}. ${SURPRISE}`
        : `Un lien privé : ta famille voit tes envies et coche ce qu'elle t'offre. ${SURPRISE}`}
    </p>,
    status.canCreate || active ? (
      <ShareLinkForm
        key="link"
        action={shareMyList}
        defaultName={status.defaultName}
        submitLabel={active ? "Créer un nouveau lien" : "Créer le lien"}
        collapsed={active ? { label: "Créer un nouveau lien", note: "L'ancien lien ne marchera plus. Ce qui est déjà offert reste noté." } : undefined}
      />
    ) : (
      <p key="link" className="text-sm" style={{ color: "var(--muted)" }}>
        Ajoute d&apos;abord des envies.
      </p>
    ),
    active ? <StopShareForm key="stop" /> : null,
  ];
}
