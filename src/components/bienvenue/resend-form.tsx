"use client";

import { useActionState } from "react";
import { requestParentConsent } from "@/app/bienvenue/actions";

// Sends the consent email again, to the address already given.
export function ResendForm() {
  const [state, action, pending] = useActionState(requestParentConsent, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="manga-panel-sm manga-press min-h-12 w-full rounded-2xl px-4 text-base font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-60"
        style={{ background: "var(--surface)", color: "var(--ink)" }}
      >
        {pending ? "Envoi…" : "Renvoyer l'email"}
      </button>
      {state?.error && (
        <p role="alert" className="text-sm font-semibold" style={{ color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
    </form>
  );
}
