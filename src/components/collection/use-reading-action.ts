"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreReading, saveReading } from "@/app/(app)/collection/actions";
import type { ReadingState } from "@/lib/collection/readings-db";

export type ReadingIntent = "finish" | "finish_earlier" | "start" | "clear";

export type ReadingTarget = { mangaId: string; title: string; volume: number };

export type ReadingToastState =
  | {
      kind: "done";
      message: string;
      sub?: string;
      celebrate: boolean;
      undo: (() => void) | null;
    }
  | { kind: "error"; retry: () => void }
  | null;

const UNDO_MS = 8000;

function messageFor(
  intent: ReadingIntent,
  t: ReadingTarget,
  volumesRead: number,
  changed: boolean,
) {
  const count = `${volumesRead} tome${volumesRead > 1 ? "s" : ""} lu${volumesRead > 1 ? "s" : ""}`;
  if (!changed) {
    return intent === "start"
      ? { message: `Tu lis déjà le tome ${t.volume}` }
      : intent === "clear"
        ? { message: `Tome ${t.volume} : pas encore lu` }
        : { message: `Le tome ${t.volume} était déjà noté comme lu` };
  }
  switch (intent) {
    case "finish":
      return { message: `Tome ${t.volume} de ${t.title} lu !`, sub: count };
    case "finish_earlier":
      return { message: `Tome ${t.volume} noté comme lu`, sub: count };
    case "start":
      return { message: `C'est parti pour le tome ${t.volume} !` };
    case "clear":
      return { message: `Tome ${t.volume} : pas encore lu`, sub: count };
  }
}

// Saves a reading, then shows what happened with an "Annuler" button.
// Nothing on screen changes before the server confirms : the page is
// refreshed from the server once the write succeeded.
export function useReadingAction() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<ReadingToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearToast = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const show = useCallback((next: ReadingToastState, ms: number | null) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(next);
    if (ms) timer.current = setTimeout(() => setToast(null), ms);
  }, []);

  // Plain functions : "Réessayer" calls them again from the toast.
  function undo(t: ReadingTarget, previous: ReadingState) {
    startTransition(async () => {
      // A dropped connection throws instead of returning an error.
      const result = await restoreReading({
        manga_id: t.mangaId,
        volume_number: t.volume,
        previous,
      }).catch(() => ({ success: false as const, error: "network" }));
      if (!result.success) {
        show({ kind: "error", retry: () => undo(t, previous) }, null);
        return;
      }
      router.refresh();
      show(
        { kind: "done", message: "Annulé", celebrate: false, undo: null },
        2500,
      );
    });
  }

  function run(intent: ReadingIntent, t: ReadingTarget, onDone?: () => void) {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
    startTransition(async () => {
      const result = await saveReading({
        manga_id: t.mangaId,
        volume_number: t.volume,
        intent,
      }).catch(() => ({ success: false as const, error: "network" }));
      if (!result.success) {
        show({ kind: "error", retry: () => run(intent, t, onDone) }, null);
        return;
      }
      router.refresh();
      onDone?.();
      const { message, sub } = messageFor(
        intent,
        t,
        result.volumesRead,
        result.changed,
      );
      show(
        {
          kind: "done",
          message,
          sub,
          celebrate: result.changed && intent === "finish",
          undo: result.changed ? () => undo(t, result.previous) : null,
        },
        UNDO_MS,
      );
    });
  }

  return { run, isPending, toast, clearToast };
}
