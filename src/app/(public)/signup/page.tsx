import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Créer un compte",
  robots: { index: false },
};

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <Link href="/" className="flex items-center gap-2 justify-center">
          <span className="text-2xl font-bold" style={{ color: "var(--accent)" }}>漫</span>
          <span className="text-base font-semibold">Yomushelf</span>
        </Link>

        <div
          className="rounded-2xl p-7 flex flex-col gap-6"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight">Crée ton compte.</h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Gratuit. Pas de CB. Prêt en 2 minutes.
            </p>
          </div>
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
