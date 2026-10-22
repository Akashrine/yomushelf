"use client";

import { useActionState } from "react";
import { askParentToShare, type ShareState } from "@/app/(app)/envies/actions";

// Under 15 : one button, the parent gets the email.
export function AskParentButton({ label }: { label: string }) {
  const [state, action, pending] = useActionState<ShareState>(askParentToShare, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.error && (
        <p role="alert" className="rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: "#fbeceb", color: "var(--danger)", border: "2px solid var(--danger)" }}>
          {state.error}
        </p>
      )}
      <p role="status" className={state.sent ? "font-bold" : "sr-only"} style={{ color: "var(--ink)" }}>
        {state.sent ? "C'est parti : ton parent a reçu un email." : ""}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="manga-button flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-base font-bold focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink)] disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
      >
        {pending ? "Envoi…" : label}
      </button>
    </form>
  );
}
