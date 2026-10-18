"use client";

import { useSyncExternalStore } from "react";
import { OPT_OUT_KEY } from "@/lib/analytics";

const listeners = new Set<() => void>();
const read = () => {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
};

// "Ne pas être mesuré" : a switch kept on this device only.
export function MeasurementToggle() {
  const refused = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => false
  );
  function toggle() {
    try {
      if (refused) localStorage.removeItem(OPT_OUT_KEY);
      else localStorage.setItem(OPT_OUT_KEY, "1");
    } catch {
      return;
    }
    listeners.forEach((l) => l());
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={refused}
      onClick={toggle}
      className="manga-panel-sm manga-press mt-3 flex min-h-12 items-center gap-3 rounded-2xl px-4 text-left text-sm font-bold"
      style={{ background: refused ? "var(--pop)" : "var(--surface)", color: "var(--ink)" }}
    >
      <span aria-hidden="true" className="flex h-6 w-11 items-center rounded-full p-0.5" style={{ background: refused ? "var(--ink)" : "var(--surface-raised)", border: "2px solid var(--ink)" }}>
        <span className="h-4 w-4 rounded-full transition-transform" style={{ background: refused ? "var(--pop)" : "var(--ink)", transform: refused ? "translateX(20px)" : "none" }} />
      </span>
      {refused ? "Mesure désactivée sur cet appareil" : "Ne pas être mesuré sur cet appareil"}
    </button>
  );
}
