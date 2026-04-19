import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 justify-center">
          <span className="text-2xl font-bold" style={{ color: "var(--accent)" }}>漫</span>
          <span className="text-base font-semibold">Yomushelf</span>
        </Link>

        {/* Card */}
        <div
          className="rounded-2xl p-7 flex flex-col gap-6"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight">Content de te revoir.</h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Connecte-toi à ta bibliothèque.
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
