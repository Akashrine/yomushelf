"use client";

import { useActionState, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { ShareState } from "@/app/(app)/envies/actions";

const noSubscribe = () => () => {};

const SUMMARY = "inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold underline decoration-2 underline-offset-4";
const BUTTON =
  "manga-button flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-base font-bold focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink)] disabled:opacity-60";

// First name, then the link, shown once : only its hash is stored, so a
// lost link is replaced by a new one.
export function ShareLinkForm({
  action,
  token,
  defaultName,
  submitLabel,
  afterText,
  notSentText,
  collapsed,
}: {
  action: (prev: ShareState, formData: FormData) => Promise<ShareState>;
  token?: string;
  defaultName: string;
  submitLabel: string;
  afterText?: string; // shown when the action also emailed a copy
  notSentText?: string; // shown when that copy did not leave
  collapsed?: { label: string; note: string }; // form behind a disclosure (renewing a link)
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [copied, setCopied] = useState(false);
  const id = useId();
  // False on the server and without the Web Share API (most desktops).
  const canShare = useSyncExternalStore(noSubscribe, () => typeof navigator.share === "function", () => false);
  // The form is replaced by the link : focus goes to the news.
  const resultRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.link) resultRef.current?.focus();
  }, [state.link]);

  if (state.link) {
    const link = state.link;
    return (
      <div className="flex flex-col gap-3">
        <p ref={resultRef} tabIndex={-1} role="status" className="font-bold outline-none" style={{ color: "var(--ink)" }}>
          Voici le lien, valable jusqu&apos;au {state.until}.
        </p>
        <label htmlFor={`${id}-link`} className="sr-only">
          Lien de la liste
        </label>
        <input
          id={`${id}-link`}
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-12 w-full rounded-xl px-3 text-sm"
          style={{ background: "white", border: "2px solid var(--ink)", color: "var(--ink)" }}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          {canShare && (
            <button
              type="button"
              className={BUTTON}
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              onClick={() => navigator.share({ title: `La liste de ${state.value ?? ""}`.trim(), url: link }).catch(() => {})}
            >
              Envoyer le lien
            </button>
          )}
          <button
            type="button"
            className={BUTTON}
            style={canShare ? { background: "var(--surface)", color: "var(--ink)" } : { background: "var(--accent)", color: "var(--accent-foreground)" }}
            onClick={() =>
              navigator.clipboard
                ?.writeText(link)
                .then(() => setCopied(true))
                .catch(() => {})
            }
          >
            {copied ? "Lien copié" : "Copier le lien"}
          </button>
        </div>
        <p role="status" className="sr-only">
          {copied ? "Lien copié." : ""}
        </p>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Toute personne qui a ce lien voit la liste : envoie-le à la famille, pas sur un réseau social.
          {state.sent && afterText ? ` ${afterText}` : ""}
          {state.sent === false && notSentText ? ` ${notSentText}` : ""}
        </p>
      </div>
    );
  }

  const form = (
    <form action={formAction} className="flex flex-col gap-3">
      {token && <input type="hidden" name="token" value={token} />}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-bold" style={{ color: "var(--ink)" }}>
          Prénom affiché sur la liste
        </label>
        <input
          id={id}
          name="display_name"
          required
          maxLength={30}
          autoComplete="off"
          defaultValue={state.value ?? defaultName}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? `${id}-error` : undefined}
          className="min-h-12 rounded-xl px-4 text-base outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          style={{ background: "white", border: "2px solid var(--ink)", color: "var(--ink)" }}
        />
      </div>
      {state.error && (
        <p id={`${id}-error`} role="alert" className="rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: "#fbeceb", color: "var(--danger)", border: "2px solid var(--danger)" }}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={BUTTON} style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>
        {pending ? "Création…" : submitLabel}
      </button>
    </form>
  );
  if (!collapsed) return form;
  return (
    <details open={!!state.error || undefined}>
      <summary className={SUMMARY}>{collapsed.label}</summary>
      <p className="my-2 text-sm" style={{ color: "var(--muted)" }}>
        {collapsed.note}
      </p>
      {form}
    </details>
  );
}
