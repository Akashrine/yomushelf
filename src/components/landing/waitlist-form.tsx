"use client";

import { useActionState } from "react";
import { joinWaitlist } from "@/app/(public)/actions";

type Props = {
  source?: "landing_hero" | "landing_footer";
  compact?: boolean;
};

const initialState = { success: false as boolean | undefined, error: undefined as string | undefined };

export function WaitlistForm({ source = "landing_hero", compact = false }: Props) {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      formData.set("source", source);
      const result = await joinWaitlist(formData);
      return result as typeof initialState;
    },
    initialState
  );

  if (state.success) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl px-5 py-4"
        style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
      >
        <span className="text-lg">✓</span>
        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Tu es sur la liste. On te prévient dès l&apos;ouverture.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className={compact ? "flex gap-2" : "flex flex-col gap-3 sm:flex-row"}>
      <input
        type="email"
        name="email"
        required
        placeholder="ton@email.fr"
        autoComplete="email"
        className={`flex-1 rounded-xl px-4 text-sm outline-none transition-all ${
          compact ? "py-2.5" : "py-3.5"
        }`}
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
      <button
        type="submit"
        disabled={pending}
        className={`shrink-0 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 ${
          compact ? "px-4 py-2.5" : "px-6 py-3.5"
        }`}
        style={{
          background: pending ? "var(--muted)" : "var(--accent)",
          color: "var(--accent-foreground)",
        }}
      >
        {pending ? "..." : "Rejoindre la liste"}
      </button>
      {state.error && (
        <p className="w-full text-xs mt-1" style={{ color: "#e74c3c" }}>
          {state.error}
        </p>
      )}
    </form>
  );
}
