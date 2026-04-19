"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveStepSelection,
  upsertOnboardingSelection,
} from "@/app/(app)/onboarding/actions";

type Manga = {
  id: string;
  title: string;
  author: string | null;
  publisher_fr: string | null;
  total_volumes: number | null;
  status: string;
  cover_url: string | null;
  top_50_rank: number | null;
  genre_primary: string | null;
};

type Props = {
  step: 1 | 2 | 3;
  mangas: Manga[];
  username: string | null;
};

const STEPS = [
  {
    title: "Quels mangas tu lis en ce moment ?",
    subtitle: "Sélectionne les séries actives dans ta collection.",
    cta: "Continuer →",
  },
  {
    title: "Tu as lu lesquels par le passé ?",
    subtitle: "Terminés, abandonnés, en pause — tout compte.",
    cta: "Continuer →",
  },
  {
    title: "D'autres séries qui t'intéressent ?",
    subtitle: "Séries que tu veux suivre même sans les avoir encore.",
    cta: "Terminer →",
  },
] as const;

function MangaCard({
  manga,
  selected,
  onToggle,
}: {
  manga: Manga;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className="relative text-left rounded-xl overflow-hidden transition-all duration-150 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
      style={{
        border: selected ? "2px solid var(--accent)" : "2px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div
        className="w-full flex items-end p-2"
        style={{
          aspectRatio: "2/3",
          background: manga.cover_url
            ? `url(${manga.cover_url}) center/cover no-repeat, #1a1010`
            : "linear-gradient(160deg,#1a1010 0%,#0e0b0b 100%)",
        }}
      >
        {!manga.cover_url && (
          <span className="text-[10px] font-bold leading-tight line-clamp-3"
            style={{ color: "var(--accent)" }}>
            {manga.title}
          </span>
        )}
      </div>

      <div className="px-2 py-1.5">
        <p className="text-[11px] font-medium leading-tight line-clamp-2">
          {manga.title}
        </p>
        {manga.total_volumes && (
          <p className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
            {manga.total_volumes} t.
          </p>
        )}
      </div>

      {selected && (
        <div
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ background: "var(--accent)", color: "white" }}
        >
          ✓
        </div>
      )}
    </button>
  );
}

export function OnboardingClient({ step, mangas, username }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const meta = STEPS[step - 1];
  const count = selected.size;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleContinue() {
    setError(null);
    startTransition(async () => {
      // Save current step's selections (non-blocking for step 1 & 2)
      if (selected.size > 0) {
        const result = await saveStepSelection([...selected]);
        if (!result.success) {
          setError(result.error);
          return;
        }
      }

      if (step < 3) {
        // Navigate to next step — clear selection visually
        router.push(`/onboarding/${step + 1}`);
        return;
      }

      // Step 3: final save + complete
      const fd = new FormData();
      fd.set("manga_ids", JSON.stringify([...selected]));
      const result = await upsertOnboardingSelection(fd);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/bibliotheque");
    });
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar */}
      <div className="h-1 w-full" style={{ background: "var(--border)" }}>
        <div
          className="h-full transition-all duration-500"
          style={{ background: "var(--accent)", width: `${(step / 3) * 100}%` }}
        />
      </div>

      {/* Nav */}
      <nav
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>漫</span>
          <span className="text-sm font-semibold">Yomushelf</span>
        </div>
        <span className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>
          Étape {step} / 3
        </span>
      </nav>

      {/* Content */}
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 pt-10 pb-36">
        {step === 1 && username && (
          <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
            Salut {username} 👋
          </p>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          {meta.title}
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
          {meta.subtitle}
          {count > 0 && (
            <span className="ml-2 font-medium" style={{ color: "var(--foreground)" }}>
              · {count} sélectionné{count > 1 ? "s" : ""}
            </span>
          )}
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {mangas.map((manga) => (
            <MangaCard
              key={manga.id}
              manga={manga}
              selected={selected.has(manga.id)}
              onToggle={() => toggle(manga.id)}
            />
          ))}
        </div>
      </main>

      {/* Sticky bottom bar */}
      <div
        className="fixed bottom-0 inset-x-0 px-4 pb-6 pt-10"
        style={{
          background: "linear-gradient(to top, var(--background) 75%, transparent)",
          pointerEvents: "none",
        }}
      >
        <div
          className="mx-auto w-full max-w-sm flex gap-3"
          style={{ pointerEvents: "auto" }}
        >
          {step > 1 && (
            <button
              type="button"
              onClick={() => router.push(`/onboarding/${step - 1}`)}
              disabled={isPending}
              className="shrink-0 px-4 py-3.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
              }}
            >
              ← Retour
            </button>
          )}
          <button
            type="button"
            onClick={handleContinue}
            disabled={isPending}
            className="flex-1 rounded-xl py-3.5 text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            {isPending ? "Sauvegarde…" : meta.cta}
          </button>
        </div>
        {error && (
          <p className="text-xs text-center mt-2" style={{ color: "#e74c3c" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
