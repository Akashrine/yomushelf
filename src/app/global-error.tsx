"use client";

// Last resort when the root layout itself fails. Plain styles : the app's
// stylesheet may not be loaded here.
export default function GlobalError({ unstable_retry }: { unstable_retry: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, background: "#f6f0e7", color: "#1d2433", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, padding: 24 }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Yomushelf ne répond pas</h1>
          <p role="alert" style={{ margin: 0 }}>Une erreur est survenue. Tes données ne sont pas perdues. Réessaie dans un instant.</p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{ minHeight: 48, borderRadius: 12, border: 0, background: "#d9452b", color: "white", fontWeight: 600, fontSize: 16 }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
