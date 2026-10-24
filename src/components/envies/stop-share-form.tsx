"use client";

import { useActionState } from "react";
import { stopMyShare, type ShareState } from "@/app/(app)/envies/actions";

const SUMMARY = "inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold underline decoration-2 underline-offset-4";

// 15 and over : stop the family link, after a confirmation.
export function StopShareForm() {
  const [state, action, pending] = useActionState<ShareState>(stopMyShare, {});
  return (
    <details open={!!state.error || undefined}>
      <summary className={SUMMARY}>Arrêter le partage</summary>
      <form action={action} className="mt-2 flex flex-col gap-2">
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Le lien ne marchera plus : ta famille ne verra plus ta liste.
        </p>
        {state.error && (
          <p role="alert" className="rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: "#fbeceb", color: "var(--danger)", border: "2px solid var(--danger)" }}>
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="manga-button flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-base font-bold focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink)] disabled:opacity-60"
          style={{ background: "var(--danger)", color: "white" }}
        >
          {pending ? "Arrêt…" : "Oui, arrêter le partage"}
        </button>
      </form>
    </details>
  );
}
