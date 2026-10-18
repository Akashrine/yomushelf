"use client";

// Last resort when the root layout itself fails. Plain inline styles : the
// app's stylesheet and fonts may not be loaded here. Same manga look with
// raw values (docs/design.md) : paper, ink, sticker yellow, terracotta.
const INK = "#12151d";
const POP = "#ffd23f";
const PAPER = "#f6f0e7";
const SURFACE = "#fffaf2";
const ACCENT = "#ad4b2c"; // white text on it passes AA
const COMIC = "Bangers, Impact, 'Arial Black', sans-serif";

export default function GlobalError({ unstable_retry }: { unstable_retry: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, background: PAPER, color: INK, fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", gap: 32, padding: 24, boxSizing: "border-box" }}>
          <div
            style={{
              position: "relative",
              background: SURFACE,
              border: `3px solid ${INK}`,
              boxShadow: `6px 6px 0 ${INK}`,
              borderRadius: 24,
              padding: "36px 24px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: -20,
                left: 20,
                background: POP,
                color: INK,
                border: `3px solid ${INK}`,
                boxShadow: `3px 3px 0 ${INK}`,
                borderRadius: 12,
                padding: "2px 12px",
                fontFamily: COMIC,
                fontSize: 24,
                letterSpacing: "0.03em",
                transform: "rotate(-6deg)",
              }}
            >
              OUPS !
            </span>
            <h1 style={{ fontFamily: COMIC, fontWeight: 400, fontSize: 34, lineHeight: 1, letterSpacing: "0.025em", margin: 0 }}>
              Yomushelf ne répond pas
            </h1>
            <p role="alert" style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>
              Une erreur est survenue. Tes données ne sont pas perdues. Réessaie dans un instant.
            </p>
          </div>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              minHeight: 56,
              borderRadius: 16,
              border: `3px solid ${INK}`,
              boxShadow: `5px 5px 0 ${INK}`,
              background: ACCENT,
              color: "white",
              fontWeight: 700,
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
