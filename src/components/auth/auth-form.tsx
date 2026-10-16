"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { resetPassword, signIn, signUp, signInWithGoogle } from "@/app/(public)/auth/actions";

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
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="min-h-12 rounded-xl px-4 text-base outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]"
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
        }}
      />
    </div>
  );
}

function FormError({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p role="alert" className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(179,38,30,0.08)", color: "var(--danger)", border: "1px solid rgba(179,38,30,0.35)" }}>
      {text}
    </p>
  );
}

// ─── Google button ────────────────────────────────────────────
function GoogleSubmit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl px-4 text-sm font-medium transition-colors disabled:opacity-60"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        color: "var(--foreground)",
      }}
    >
      {children}
      {pending && <span className="sr-only">Connexion à Google…</span>}
    </button>
  );
}

function GoogleButton({ label }: { label: string }) {
  return (
    <form action={signInWithGoogle}>
      <GoogleSubmit>
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
      </GoogleSubmit>
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
export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState(signIn, {});

  return (
    <div className="flex flex-col gap-5">
      <FormError text={notice} />
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
          autoComplete="current-password"
        />

        <FormError text={state?.error} />

        <button
          type="submit"
          disabled={pending}
          className="mt-1 min-h-12 w-full rounded-xl text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          {pending ? "Connexion…" : "Se connecter"}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-x-3 text-sm" style={{ color: "var(--muted)" }}>
          <Link href="/signup" className="flex min-h-11 items-center underline-offset-4 hover:underline">
            Pas encore de compte ?
          </Link>
          <Link href="/forgot-password" className="flex min-h-11 items-center underline-offset-4 hover:underline">
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
        <p className="mb-2 text-base font-semibold" role="status">Vérifie tes emails.</p>
        <p style={{ color: "var(--muted)" }}>
          On t&apos;a envoyé un lien de confirmation. Clique dessus pour activer ton compte.
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
          label="Pseudo (facultatif)"
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

        <FormError text={state?.error} />

        <button
          type="submit"
          disabled={pending}
          className="mt-1 min-h-12 w-full rounded-xl text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          {pending ? "Création…" : "Créer mon compte"}
        </button>

        <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
          Déjà un compte ?{" "}
          <Link href="/login" className="inline-flex min-h-11 items-center underline underline-offset-4" style={{ color: "var(--foreground)" }}>
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  );
}

// ─── Forgot password ──────────────────────────────────────────
export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(resetPassword, {});
  if (state?.success) {
    return (
      <p role="status" className="rounded-xl p-5 text-sm leading-relaxed" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
        Si un compte existe pour cet email, tu vas recevoir un lien pour choisir un nouveau mot de passe. Pense à regarder tes
        courriers indésirables.
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Email" name="email" type="email" placeholder="ton@email.fr" autoComplete="email" />
      <FormError text={state?.error} />
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl text-sm font-semibold disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
      >
        {pending ? "Envoi…" : "Recevoir le lien"}
      </button>
      <Link href="/login" className="flex min-h-11 items-center justify-center text-sm underline underline-offset-4" style={{ color: "var(--muted)" }}>
        Retour à la connexion
      </Link>
    </form>
  );
}
