"use client";

// Stylized cover tiles — replaced by real Supabase Storage covers after ingestion
const COVERS = [
  { title: "One Piece",        sub: "尾田栄一郎", color: "#1a1040", accent: "#f0b429" },
  { title: "Chainsaw Man",     sub: "藤本タツキ", color: "#2a0a0a", accent: "#c0392b" },
  { title: "Jujutsu Kaisen",   sub: "芥見下々",   color: "#0a1a2a", accent: "#4a9eff" },
  { title: "Spy × Family",     sub: "遠藤達哉",   color: "#0f1a10", accent: "#4ade80" },
  { title: "Blue Lock",        sub: "金城宗幸",   color: "#0a0a2a", accent: "#818cf8" },
  { title: "Frieren",          sub: "山田鐘人",   color: "#1a1510", accent: "#d97706" },
  { title: "Kaiju No.8",       sub: "松本直也",   color: "#0a1510", accent: "#34d399" },
  { title: "Solo Leveling",    sub: "追儺",       color: "#150a1a", accent: "#c084fc" },
  { title: "Demon Slayer",     sub: "吾峠呼世晴", color: "#1a0a10", accent: "#fb7185" },
  { title: "Vinland Saga",     sub: "幸村誠",     color: "#0f150a", accent: "#86efac" },
  { title: "Berserk",          sub: "三浦建太郎", color: "#100a0a", accent: "#f87171" },
  { title: "Dungeon Meshi",    sub: "九井諒子",   color: "#10150a", accent: "#bef264" },
];

function CoverTile({
  title,
  sub,
  color,
  accent,
}: {
  title: string;
  sub: string;
  color: string;
  accent: string;
}) {
  return (
    <div
      className="relative flex flex-col justify-between overflow-hidden rounded-lg p-3 select-none"
      style={{
        background: `linear-gradient(160deg, ${color} 0%, #0e0b0b 100%)`,
        border: `1px solid ${accent}22`,
        aspectRatio: "2/3",
      }}
    >
      {/* Spine accent */}
      <div
        className="absolute left-0 top-0 h-full w-1 rounded-l-lg opacity-70"
        style={{ background: accent }}
      />
      {/* Publisher dot */}
      <div
        className="h-1.5 w-1.5 rounded-full opacity-80 ml-2"
        style={{ background: accent }}
      />
      {/* Title */}
      <div className="mt-auto ml-2">
        <p
          className="text-[10px] font-bold leading-tight"
          style={{ color: accent }}
        >
          {title}
        </p>
        <p className="text-[8px] mt-0.5 opacity-40" style={{ color: "var(--foreground)" }}>
          {sub}
        </p>
      </div>
    </div>
  );
}

export function CoverMosaic() {
  const col1 = COVERS.slice(0, 4);
  const col2 = COVERS.slice(4, 8);
  const col3 = COVERS.slice(8, 12);

  return (
    <div
      className="relative w-full max-w-sm mx-auto lg:max-w-none pointer-events-none"
      aria-hidden="true"
    >
      {/* Fade top/bottom */}
      <div
        className="absolute inset-x-0 top-0 h-16 z-10"
        style={{
          background: "linear-gradient(to bottom, var(--background), transparent)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-24 z-10"
        style={{
          background: "linear-gradient(to top, var(--background), transparent)",
        }}
      />
      {/* Left fade */}
      <div
        className="absolute inset-y-0 left-0 w-8 z-10"
        style={{
          background: "linear-gradient(to right, var(--background), transparent)",
        }}
      />
      {/* Right fade */}
      <div
        className="absolute inset-y-0 right-0 w-8 z-10"
        style={{
          background: "linear-gradient(to left, var(--background), transparent)",
        }}
      />

      <div className="grid grid-cols-3 gap-2 p-2">
        {/* Column 1 — offset down */}
        <div className="flex flex-col gap-2 mt-8">
          {col1.map((c) => (
            <CoverTile key={c.title} {...c} />
          ))}
        </div>
        {/* Column 2 — normal */}
        <div className="flex flex-col gap-2">
          {col2.map((c) => (
            <CoverTile key={c.title} {...c} />
          ))}
        </div>
        {/* Column 3 — offset down more */}
        <div className="flex flex-col gap-2 mt-14">
          {col3.map((c) => (
            <CoverTile key={c.title} {...c} />
          ))}
        </div>
      </div>
    </div>
  );
}
