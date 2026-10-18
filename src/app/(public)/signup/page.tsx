import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth/auth-form";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";

export const metadata: Metadata = {
  title: "Créer un compte",
  robots: { index: false },
};

export default function SignupPage() {
  return (
    <div className="manga-halftone relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden px-4 py-16" style={{ color: "var(--ink)" }}>
      <span aria-hidden="true" className="manga-speedlines pointer-events-none absolute inset-0" />
      <PageViewTracker event="signup_viewed" />
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
            Go !
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl leading-none">Crée ton compte.</h1>
            <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              Gratuit. Pas de CB. Prêt en 2 minutes.
            </p>
            <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              Moins de 15 ans ? On demandera l&apos;accord d&apos;un parent.
            </p>
          </div>
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
