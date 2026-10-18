import type { Metadata } from "next";
import Link from "next/link";
import { hashConsentToken, isConsentToken, serviceClient } from "@/lib/server/consent";
import { deleteChildAccount, giveConsent } from "../actions";

export const metadata: Metadata = {
  title: "Accord parental",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const PRIMARY =
  "manga-button flex min-h-14 w-full items-center justify-center rounded-2xl px-6 text-lg font-bold focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink)]";
const LINK = "inline-flex min-h-11 items-center text-sm font-semibold underline decoration-2 underline-offset-4";

type Params = { ok?: string; refuser?: string; retirer?: string; erreur?: string };

// The page a parent opens from the consent email. Reading it changes
// nothing ; each answer is a button (POST).
export default async function AccordPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Params> }) {
  const { token } = await params;
  const query = await searchParams;

  if (token === "supprime") {
    return (
      <Frame title="Compte supprimé.">
        <p>Le compte de ton enfant et toutes ses données ont été supprimés. Tu n&apos;as rien d&apos;autre à faire.</p>
      </Frame>
    );
  }

  const consent = isConsentToken(token) ? await loadConsent(token) : null;
  if (!consent) {
    return (
      <Frame title="Ce lien n'est plus valable.">
        <p>
          Le compte a peut-être déjà été supprimé, ou un email plus récent t&apos;a été envoyé : utilise le dernier reçu.
        </p>
      </Frame>
    );
  }

  const who = consent.username ? `Ton enfant (pseudo « ${consent.username} »)` : "Ton enfant";
  const expired = consent.expired;
  const error = query.erreur === "1" && (
    <p role="alert" className="rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: "#fbeceb", color: "var(--danger)", border: "2px solid var(--danger)" }}>
      Le compte n&apos;a pas pu être supprimé. Réessaie dans quelques minutes.
    </p>
  );

  if (query.refuser === "1" || query.retirer === "1") {
    return (
      <Frame title="Supprimer le compte ?">
        {error}
        <p>Le compte de ton enfant et toutes ses données (collection, lectures, envies) seront supprimés. C&apos;est définitif.</p>
        <form action={deleteChildAccount}>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className={PRIMARY} style={{ background: "var(--danger)", color: "white" }}>
            Supprimer le compte
          </button>
        </form>
        <Link href={`/accord/${token}`} className={LINK}>
          Annuler
        </Link>
      </Frame>
    );
  }

  if (consent.confirmed_at) {
    return (
      <Frame title={query.ok === "1" ? "C'est fait, merci !" : "Ton accord est enregistré."}>
        {error}
        <p>
          {who}{" "}peut utiliser Yomushelf. Découvrir ne lui propose que des séries recommandées pour la jeunesse par le CNLJ (BnF),
          et son profil reste privé.
        </p>
        <p>Garde cet email : ce même lien te permet de retirer ton accord à tout moment.</p>
        <Link href={`/accord/${token}?retirer=1`} className={LINK}>
          Retirer mon accord et supprimer le compte
        </Link>
      </Frame>
    );
  }

  if (expired) {
    return (
      <Frame title="Ce lien a expiré.">
        <p>Le compte sans accord va être supprimé. Ton enfant peut en créer un nouveau et te renvoyer une demande.</p>
        <Link href={`/accord/${token}?refuser=1`} className={LINK}>
          Supprimer le compte tout de suite
        </Link>
      </Frame>
    );
  }

  return (
    <Frame title="Ton enfant veut utiliser Yomushelf.">
      {error}
      <p>
        {who}{" "}a créé un compte sur Yomushelf, une app gratuite pour suivre sa collection de mangas : ses tomes, ses lectures, ses
        envies. Avant 15 ans, la loi demande l&apos;accord d&apos;un parent.
      </p>
      <ul className="flex list-disc flex-col gap-1.5 pl-5">
        <li>Pas de publicité, pas de profil public, pas de messagerie.</li>
        <li>Découvrir ne propose que des séries recommandées pour la jeunesse par le CNLJ (BnF).</li>
        <li>On garde ton email pour ce lien et pour t&apos;écrire au sujet de ce compte. Jamais de pub.</li>
        <li>Tu peux retirer ton accord quand tu veux, avec ce même lien.</li>
      </ul>
      <form action={giveConsent}>
        <input type="hidden" name="token" value={token} />
        <button type="submit" className={PRIMARY} style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>
          Je donne mon accord
        </button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <Link href={`/accord/${token}?refuser=1`} className={LINK}>
          Je refuse
        </Link>
        <Link href="/confidentialite" className={LINK}>
          Confidentialité
        </Link>
      </div>
    </Frame>
  );
}

async function loadConsent(token: string) {
  const service = serviceClient();
  const { data } = await service
    .from("parental_consents")
    .select("user_id, expires_at, confirmed_at")
    .eq("token_hash", hashConsentToken(token))
    .maybeSingle();
  if (!data) return null;
  const { data: profile } = await service.from("profiles").select("username").eq("id", data.user_id).maybeSingle();
  const expired = !data.confirmed_at && new Date(data.expires_at).getTime() < Date.now();
  return { ...data, expired, username: profile?.username ?? null };
}

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="manga-halftone relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden px-4 py-16" style={{ color: "var(--ink)" }}>
      <div className="relative flex w-full max-w-md flex-col gap-8">
        <Link href="/" className="flex min-h-11 items-center justify-center gap-2 font-display text-3xl tracking-wide">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg text-xl" style={{ background: "var(--ink)", color: "var(--pop)" }} aria-hidden="true">
            漫
          </span>
          Yomushelf
        </Link>
        <div className="manga-panel flex flex-col gap-5 rounded-3xl p-6 text-[0.95rem] font-medium leading-relaxed sm:p-7">
          <h1 className="text-4xl leading-none">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
