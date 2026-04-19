export function WrappedCardOpener({
  year,
  username,
  avatarInitials,
}: {
  year: number;
  username: string | null;
  avatarInitials: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
      {/* Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 40%, #c0392b33 0%, transparent 70%)",
        }}
      />

      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold relative z-10"
        style={{ background: "#c0392b", color: "white" }}
      >
        {avatarInitials}
      </div>

      <div className="relative z-10">
        <p className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
          {username ? `@${username}` : "Ta collection"}
        </p>
        <div
          className="text-8xl font-bold leading-none tracking-tighter mb-3"
          style={{ color: "white" }}
        >
          {year}
        </div>
        <p className="text-xl font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
          Ton année en mangas
        </p>
      </div>

      <p className="text-xs relative z-10" style={{ color: "rgba(255,255,255,0.35)" }}>
        Swipe → pour continuer
      </p>
    </div>
  );
}
