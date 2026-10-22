"use client";

import { useEffect, useRef } from "react";

// The result of "Je l'offre" / "Annuler", after the page reloads : focus
// lands on it, so a screen reader reads it and the keyboard goes on from here.
export function ListNotice({ text, error }: { text: string; error: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <p
      ref={ref}
      tabIndex={-1}
      role={error ? "alert" : "status"}
      className="rounded-xl px-3 py-2 text-sm font-semibold outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent)]"
      style={error ? { background: "#fbeceb", color: "var(--danger)", border: "2px solid var(--danger)" } : { background: "var(--pop)", color: "var(--ink)", border: "2px solid var(--ink)" }}
    >
      {text}
    </p>
  );
}
