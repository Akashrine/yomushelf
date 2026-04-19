export function WrappedCardStat({
  value,
  unit,
  label,
  sub,
  accent = false,
}: {
  value: string;
  unit?: string;
  label: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: accent
            ? "radial-gradient(ellipse 50% 30% at 50% 50%, #c0392b22 0%, transparent 70%)"
            : "none",
        }}
      />

      <p
        className="text-xs uppercase tracking-widest relative z-10"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        {label}
      </p>

      <div className="relative z-10 flex items-end justify-center gap-2">
        <span
          className="font-bold leading-none tracking-tighter"
          style={{
            fontSize: "clamp(80px, 20vw, 130px)",
            color: accent ? "#c0392b" : "white",
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            className="text-2xl font-semibold mb-3"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {unit}
          </span>
        )}
      </div>

      {sub && (
        <p className="text-base relative z-10" style={{ color: "rgba(255,255,255,0.5)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}
