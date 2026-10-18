import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
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
            Oups !
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl leading-none">Mot de passe oublié</h1>
            <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              Indique ton email : tu recevras un lien pour te connecter, puis tu choisiras un nouveau mot de passe dans tes réglages.
            </p>
          </div>
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
