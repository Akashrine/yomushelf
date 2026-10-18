"use client";

const INK = "var(--ink, #12151d)";

export default function CollectionError({ unstable_retry }: { unstable_retry: () => void }) {
  return (
    <main className="manga-halftone flex min-h-screen items-center justify-center px-6 py-12" style={{ color: INK }}>
      <div className="flex w-full max-w-md flex-col gap-8">
        {/* Speech bubble */}
        <div className="manga-panel relative flex flex-col gap-3 rounded-3xl px-6 pb-6 pt-9">
          <span
            aria-hidden="true"
            className="manga-sticker font-display absolute -top-5 left-5 rounded-xl px-3 py-0.5 text-2xl tracking-wide"
            style={{ background: "var(--pop, #ffd23f)", color: INK, transform: "rotate(-6deg)", fontWeight: 400 }}
          >
            Oups !
          </span>
          <h1 className="text-4xl">Impossible de charger tes informations</h1>
          <p role="alert" className="text-base" style={{ color: "var(--foreground)" }}>
            Vérifie ta connexion, puis réessaie.
          </p>
          <span
            aria-hidden="true"
            className="absolute -bottom-3.75 left-12 h-6 w-6 rotate-45"
            style={{ background: "var(--surface)", borderRight: `3px solid ${INK}`, borderBottom: `3px solid ${INK}` }}
          />
        </div>
        <button
          type="button"
          onClick={unstable_retry}
          className="manga-button min-h-14 rounded-2xl px-6 text-lg font-bold"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          Réessayer
        </button>
      </div>
    </main>
  );
}
