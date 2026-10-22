import type { SharedWishlist } from "@/lib/types/database";
import { formatEur } from "@/lib/collection/value";
import { cancelOffer, offerItem } from "@/app/(public)/liste/actions";
import { ListNotice } from "./list-notice";

type Item = SharedWishlist["items"][number];

// What happened on this volume, after "Je l'offre" or "Annuler".
export const NOTICES = {
  offert: { text: "C'est noté : tu l'offres. Les autres le voient comme déjà offert.", error: false },
  annule: { text: "C'est annulé : ce tome est de nouveau libre.", error: false },
  deja: { text: "Quelqu'un l'offre déjà. Choisis-en un autre.", error: true },
  trop: { text: "Beaucoup d'actions sur cette liste. Réessaie dans quelques minutes.", error: true },
  "pas-toi": { text: "Seul l'appareil qui l'a coché peut l'annuler.", error: true },
  erreur: { text: "Pas enregistré. Réessaie.", error: true },
  retire: { text: "Ce tome n'est plus dans la liste.", error: true },
} as const;
export type Notice = keyof typeof NOTICES;

const BUTTON =
  "manga-button flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-base font-bold focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink)] sm:w-auto";

// One wished volume on the family's page.
// owner : the reader on their own link, who must not see what is offered.
export function SharedWishCard({ item, token, notice, owner }: { item: Item; token: string; notice: Notice | null; owner: boolean }) {
  const which = item.volume_number != null ? `tome ${item.volume_number}` : "toute la série";
  const label = `${item.title}, ${which}`;
  // A double tap answers twice : say what is true now.
  const shown = notice === "deja" && item.mine ? "offert" : notice === "pas-toi" && !item.reserved ? "annule" : notice;
  const n = shown ? NOTICES[shown] : null;
  return (
    <li
      id={`tome-${item.id}`}
      className="manga-panel-sm flex scroll-mt-6 gap-3 rounded-2xl p-3"
      style={{ background: item.reserved && !item.mine ? "var(--surface-raised)" : "var(--surface)" }}
    >
      <span
        aria-hidden="true"
        className="shrink-0 overflow-hidden rounded-lg"
        style={{
          width: 64,
          aspectRatio: "2/3",
          border: "2px solid var(--ink)",
          background: item.cover_url
            ? `url("${encodeURI(item.cover_url)}") center/cover no-repeat, var(--surface-raised)`
            : "radial-gradient(circle, rgba(18,21,29,0.16) 1px, transparent 1.4px) 0 0 / 8px 8px, var(--pop)",
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <h2 className="text-lg font-bold leading-tight" style={{ fontFamily: "inherit" }}>
            {item.title}
          </h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {item.volume_number != null ? `Tome ${item.volume_number}` : "Toute la série"}
            {item.price_eur != null && <> · ≈ {formatEur(Number(item.price_eur))}</>}
          </p>
          {item.priority === "high" && (
            <span className="mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-bold" style={{ background: "var(--pop)", color: "var(--ink)", border: "2px solid var(--ink)" }}>
              Très envie
            </span>
          )}
        </div>

        {n && <ListNotice text={n.text} error={n.error} />}

        {owner ? null : !item.reserved ? (
          <form action={offerItem}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="item" value={item.id} />
            <button type="submit" className={BUTTON} style={{ background: "var(--accent)", color: "var(--accent-foreground)" }} aria-label={`Je l'offre : ${label}`}>
              Je l&apos;offre
            </button>
          </form>
        ) : item.mine ? (
          <form action={cancelOffer} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="item" value={item.id} />
            <span className="font-bold">✓ Tu l&apos;offres.</span>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center text-sm font-semibold underline decoration-2 underline-offset-4"
              aria-label={`Annuler : je n'offre plus ${label}`}
            >
              Annuler
            </button>
          </form>
        ) : (
          <p className="text-sm font-semibold">Déjà offert par quelqu&apos;un de la famille.</p>
        )}
      </div>
    </li>
  );
}
