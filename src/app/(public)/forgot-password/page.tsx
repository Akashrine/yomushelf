import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <Link href="/" className="flex min-h-11 items-center justify-center gap-2">
          <span className="text-2xl font-bold" style={{ color: "var(--accent)" }} aria-hidden="true">漫</span>
          <span className="text-base font-semibold">Yomushelf</span>
        </Link>
        <div className="flex flex-col gap-6 rounded-2xl p-7" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight">Mot de passe oublié</h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Indique ton email : tu recevras un lien pour te connecter, puis tu choisiras un nouveau mot de passe dans tes réglages.
            </p>
          </div>
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
