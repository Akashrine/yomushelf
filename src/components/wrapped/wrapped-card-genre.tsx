export function WrappedCardGenre({
  genre,
  delta,
  year,
}: {
  genre: string | null;
  delta: number | null;
  year: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 30% at 50% 55%, #c0392b1a 0%, transparent 70%)",
        }}
      />

      <p
        className="text-xs uppercase tracking-widest relative z-10"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        Genre dominant
      </p>

      <div
        className="relative z-10 font-bold leading-none tracking-tighter text-center"
        style={{
          fontSize: "clamp(48px, 12vw, 72px)",
          color: "white",
        }}
      >
        {genre ?? "Éclectique"}
      </div>

      <div
        className="relative z-10 px-5 py-2 rounded-full"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
          le genre le plus représenté en {year}
        </span>
      </div>

      {delta !== null && (
        <div
          className="relative z-10 flex items-center gap-2 mt-2"
        >
          <span
            className="text-2xl font-bold"
            style={{ color: delta >= 0 ? "#22c55e" : "#e74c3c" }}
          >
            {delta >= 0 ? "+" : ""}{delta.toFixed(0)}%
          </span>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
            vs {year - 1}
          </span>
        </div>
      )}
    </div>
  );
}
