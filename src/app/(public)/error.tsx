"use client";

export default function PublicError({ unstable_retry }: { unstable_retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-bold">Cette page ne s&apos;est pas chargée</h1>
      <p role="alert">Vérifie ta connexion, puis réessaie.</p>
      <button type="button" onClick={unstable_retry} className="min-h-12 rounded-xl px-4 font-semibold" style={{ background: "var(--accent)", color: "white" }}>
        Réessayer
      </button>
    </main>
  );
}
