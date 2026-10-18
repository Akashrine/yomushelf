"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { resetPassword, signIn, signUp, signInWithGoogle } from "@/app/(public)/auth/actions";
import { SourceField } from "@/components/analytics/source-field";

// Primary submit : the accent manga button, one per screen.
const SUBMIT =
  "manga-button mt-1 min-h-14 w-full rounded-2xl px-6 text-lg font-bold focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink)] disabled:opacity-60";
const SUBMIT_STYLE = { background: "var(--accent)", color: "var(--accent-foreground)" } as const;

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
      <label htmlFor={id} className="text-sm font-bold" style={{ color: "var(--ink)" }}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="min-h-12 rounded-xl px-4 text-base outline-none transition-shadow placeholder:text-[var(--muted)] focus-visible:ring-4 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] motion-reduce:transition-none"
        style={{
          background: "white",
          border: "2px solid var(--ink)",
          color: "var(--ink)",
        }}
      />
    </div>
  );
}

function FormError({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p role="alert" className="rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: "#fbeceb", color: "var(--danger)", border: "2px solid var(--danger)" }}>
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
      className="manga-panel-sm manga-press flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl px-4 text-base font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-60"
      style={{
        background: "var(--surface)",
        color: "var(--ink)",
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
      <SourceField />
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
      <div className="h-0.5 flex-1" style={{ background: "var(--ink)" }} />
      <span className="rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-widest" style={{ background: "var(--ink)", color: "var(--pop)" }}>ou</span>
      <div className="h-0.5 flex-1" style={{ background: "var(--ink)" }} />
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
          className={SUBMIT}
          style={SUBMIT_STYLE}
        >
          {pending ? "Connexion…" : "Se connecter"}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-x-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>
          <Link href="/signup" className="flex min-h-11 items-center underline decoration-2 underline-offset-4">
            Pas encore de compte ?
          </Link>
          <Link href="/forgot-password" className="flex min-h-11 items-center underline decoration-2 underline-offset-4">
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
        className="manga-panel-sm rounded-2xl p-5 text-center text-sm leading-relaxed"
        style={{ background: "var(--pop)", color: "var(--ink)" }}
      >
        <p className="mb-2 font-display text-3xl" role="status">Vérifie tes emails.</p>
        <p className="font-medium">
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
        <SourceField />
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
          className={SUBMIT}
          style={SUBMIT_STYLE}
        >
          {pending ? "Création…" : "Créer mon compte"}
        </button>

        <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
          Déjà un compte ?{" "}
          <Link href="/login" className="inline-flex min-h-11 items-center font-bold underline decoration-2 underline-offset-4" style={{ color: "var(--ink)" }}>
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
      <p role="status" className="manga-panel-sm rounded-2xl p-5 text-sm font-medium leading-relaxed" style={{ background: "var(--pop)", color: "var(--ink)" }}>
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
        className={SUBMIT}
        style={SUBMIT_STYLE}
      >
        {pending ? "Envoi…" : "Recevoir le lien"}
      </button>
      <Link href="/login" className="flex min-h-11 items-center justify-center text-sm font-semibold underline decoration-2 underline-offset-4" style={{ color: "var(--ink)" }}>
        Retour à la connexion
      </Link>
    </form>
  );
}
