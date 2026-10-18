"use client";

import { useActionState, useId } from "react";
import { requestParentConsent } from "@/app/bienvenue/actions";

export function ParentEmailForm() {
  const [state, action, pending] = useActionState(requestParentConsent, {});
  const id = useId();
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-bold" style={{ color: "var(--ink)" }}>
          Email de ton parent
        </label>
        <input
          id={id}
          name="parent_email"
          type="email"
          required
          autoComplete="off"
          placeholder="parent@email.fr"
          aria-describedby={state?.error ? `${id}-error` : undefined}
          className="min-h-12 rounded-xl px-4 text-base outline-none placeholder:text-[var(--muted)] focus-visible:ring-4 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          style={{ background: "white", border: "2px solid var(--ink)", color: "var(--ink)" }}
        />
      </div>
      {state?.error && (
        <p id={`${id}-error`} role="alert" className="rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: "#fbeceb", color: "var(--danger)", border: "2px solid var(--danger)" }}>
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="manga-button min-h-14 w-full rounded-2xl px-6 text-lg font-bold focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink)] disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
      >
        {pending ? "Envoi…" : "Envoyer à mon parent"}
      </button>
    </form>
  );
}
