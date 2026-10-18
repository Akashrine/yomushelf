import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false },
};

// Errors sent back by the Google sign-in and the email link callback.
const CALLBACK_ERRORS: Record<string, string> = {
  oauth: "La connexion avec Google n'a pas abouti. Réessaie.",
  access_denied: "Connexion annulée.",
  no_code: "Ce lien de connexion n'est pas valable. Redemande-en un.",
  // Mail scanners sometimes open links before the reader : a sign-up is
  // then confirmed all the same.
  link_invalid:
    "Ce lien a expiré ou a déjà servi. Si tu venais de créer ton compte, il est sans doute confirmé : connecte-toi avec ton mot de passe. Sinon, redemande un lien.",
  // Also happens when the link is opened on another device than the one
  // that asked for it (PKCE) : a sign-up is then confirmed all the same.
  exchange_failed:
    "Ce lien n'a pas pu te connecter ici. Si tu venais de créer ton compte, il est confirmé : connecte-toi avec ton mot de passe. Sinon, redemande un lien.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const notice = error ? CALLBACK_ERRORS[error] ?? "La connexion n'a pas abouti. Réessaie." : undefined;
  return (
    <div className="manga-halftone relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden px-4 py-16" style={{ color: "var(--ink)" }}>
      <span aria-hidden="true" className="manga-speedlines pointer-events-none absolute inset-0" />
      <div className="relative flex w-full max-w-sm flex-col gap-8">
        <Link href="/" className="flex min-h-11 items-center justify-center gap-2 font-display text-3xl tracking-wide">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg text-xl" style={{ background: "var(--ink)", color: "var(--pop)" }} aria-hidden="true">
            漫
          </span>
          Yomushelf
        </Link>

        <div className="manga-panel relative flex flex-col gap-6 rounded-3xl p-6 pt-8 sm:p-7 sm:pt-9">
          <span
            aria-hidden="true"
            className="manga-sticker absolute -top-5 right-5 rounded-xl px-3 py-0.5 font-display text-xl tracking-wide"
            style={{ background: "var(--pop)", color: "var(--ink)", transform: "rotate(6deg)" }}
          >
            Yo !
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl leading-none">Content de te revoir.</h1>
            <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              Connecte-toi à ta bibliothèque.
            </p>
          </div>
          <LoginForm notice={notice} />
        </div>
      </div>
    </div>
  );
}
