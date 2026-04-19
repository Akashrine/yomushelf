"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, signUp, signInWithGoogle } from "@/app/(public)/auth/actions";

// ─── Shared field ─────────────────────────────────────────────
function Field({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
        {label}
      </label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="rounded-xl px-4 py-3 text-sm outline-none transition-all"
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
    </div>
  );
}

// ─── Google button ────────────────────────────────────────────
function GoogleButton({ label }: { label: string }) {
  return (
    <form action={signInWithGoogle}>
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
          />
          <path
            fill="#34A853"
            d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z"
          />
          <path
            fill="#EA4335"
            d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
          />
        </svg>
        {label}
      </button>
    </form>
  );
}

// ─── Divider ──────────────────────────────────────────────────
function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      <span className="text-xs" style={{ color: "var(--muted)" }}>ou</span>
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    </div>
  );
}

// ─── Login form ───────────────────────────────────────────────
export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, {});

  return (
    <div className="flex flex-col gap-5">
      <GoogleButton label="Continuer avec Google" />
      <Divider />
      <form action={action} className="flex flex-col gap-4">
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="ton@email.fr"
          autoComplete="email"
        />
        <Field
          label="Mot de passe"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
        />

        {state?.error && (
          <p className="text-xs rounded-lg px-3 py-2"
            style={{ background: "#c0392b22", color: "#e74c3c", border: "1px solid #c0392b44" }}>
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl py-3 text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-60 mt-1"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          {pending ? "Connexion…" : "Se connecter"}
        </button>

        <div className="flex items-center justify-between text-xs" style={{ color: "var(--muted)" }}>
          <Link href="/signup" className="hover:underline">
            Pas encore de compte ?
          </Link>
          <Link href="/forgot-password" className="hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
      </form>
    </div>
  );
}

// ─── Signup form ──────────────────────────────────────────────
export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, {});

  if (state?.success) {
    return (
      <div
        className="rounded-xl p-5 text-sm leading-relaxed text-center"
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
        }}
      >
        <p className="text-base font-semibold mb-2">Vérifie tes emails 📬</p>
        <p style={{ color: "var(--muted)" }}>
          On t'a envoyé un lien de confirmation. Clique dessus pour activer ton compte.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <GoogleButton label="S'inscrire avec Google" />
      <Divider />
      <form action={action} className="flex flex-col gap-4">
        <Field
          label="Pseudo (optionnel)"
          name="username"
          placeholder="ton_pseudo"
          autoComplete="username"
          required={false}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="ton@email.fr"
          autoComplete="email"
        />
        <Field
          label="Mot de passe"
          name="password"
          type="password"
          placeholder="8 caractères minimum"
          autoComplete="new-password"
        />

        {state?.error && (
          <p className="text-xs rounded-lg px-3 py-2"
            style={{ background: "#c0392b22", color: "#e74c3c", border: "1px solid #c0392b44" }}>
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl py-3 text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-60 mt-1"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          {pending ? "Création…" : "Créer mon compte"}
        </button>

        <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
          Déjà un compte ?{" "}
          <Link href="/login" className="hover:underline" style={{ color: "var(--foreground)" }}>
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  );
}
