const COVERS = [
  { title: "One Piece",      sub: "尾田栄一郎", color: "#1a1040", accent: "#f0b429" },
  { title: "Chainsaw Man",   sub: "藤本タツキ", color: "#2a0a0a", accent: "#c0392b" },
  { title: "Jujutsu Kaisen", sub: "芥見下々",   color: "#0a1a2a", accent: "#4a9eff" },
  { title: "Spy × Family",   sub: "遠藤達哉",   color: "#0f1a10", accent: "#4ade80" },
  { title: "Blue Lock",      sub: "金城宗幸",   color: "#0a0a2a", accent: "#818cf8" },
  { title: "Frieren",        sub: "山田鐘人",   color: "#1a1510", accent: "#d97706" },
  { title: "Kaiju No.8",     sub: "松本直也",   color: "#0a1510", accent: "#34d399" },
  { title: "Solo Leveling",  sub: "追儺",       color: "#150a1a", accent: "#c084fc" },
  { title: "Demon Slayer",   sub: "吾峠呼世晴", color: "#1a0a10", accent: "#fb7185" },
  { title: "Vinland Saga",   sub: "幸村誠",     color: "#0f150a", accent: "#86efac" },
  { title: "Berserk",        sub: "三浦建太郎", color: "#100a0a", accent: "#f87171" },
  { title: "Dungeon Meshi",  sub: "九井諒子",   color: "#10150a", accent: "#bef264" },
];

function MiniCoverTile({ title, sub, color, accent }: (typeof COVERS)[number]) {
  return (
    <div
      className="relative flex flex-col justify-between overflow-hidden rounded-md p-2 select-none"
      style={{
        background: `linear-gradient(160deg, ${color} 0%, #0e0b0b 100%)`,
        border: `1px solid ${accent}22`,
        aspectRatio: "2/3",
      }}
    >
      <div className="absolute left-0 top-0 h-full w-0.5 rounded-l-md opacity-70" style={{ background: accent }} />
      <div className="h-1 w-1 rounded-full opacity-80 ml-1.5" style={{ background: accent }} />
      <div className="mt-auto ml-1.5">
        <p className="text-[7px] font-bold leading-tight" style={{ color: accent }}>{title}</p>
        <p className="text-[5px] mt-0.5 opacity-40" style={{ color: "#fff" }}>{sub}</p>
      </div>
    </div>
  );
}

export function LibraryPhoneMockup() {
  const col1 = COVERS.slice(0, 4);
  const col2 = COVERS.slice(4, 8);
  const col3 = COVERS.slice(8, 12);

  return (
    <div className="flex justify-center items-center h-full" aria-hidden="true">
      <div
        className="relative overflow-hidden"
        style={{
          width: 270,
          borderRadius: 40,
          background: "#110e0e",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 40px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03)",
          transform: "rotate(2deg)",
        }}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-1">
          <span className="text-[9px] font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-1 rounded-sm" style={{ background: "rgba(255,255,255,0.3)" }} />
            <div className="w-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.3)" }} />
          </div>
        </div>

        {/* App header */}
        <div className="px-4 pt-2 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-tight text-white">Ma bibliothèque</p>
              <p className="text-[8px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>847 tomes · 32 séries</p>
            </div>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{ background: "var(--accent)", color: "white" }}
            >
              漫
            </div>
          </div>
        </div>

        {/* Cover grid */}
        <div className="relative px-3 pt-3 pb-0" style={{ height: 380, overflow: "hidden" }}>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="flex flex-col gap-1.5 mt-4">
              {col1.map((c) => <MiniCoverTile key={c.title} {...c} />)}
            </div>
            <div className="flex flex-col gap-1.5">
              {col2.map((c) => <MiniCoverTile key={c.title} {...c} />)}
            </div>
            <div className="flex flex-col gap-1.5 mt-8">
              {col3.map((c) => <MiniCoverTile key={c.title} {...c} />)}
            </div>
          </div>
          {/* Bottom fade */}
          <div
            className="absolute bottom-0 inset-x-0 h-24 pointer-events-none"
            style={{ background: "linear-gradient(to top, #110e0e 40%, transparent)" }}
          />
        </div>
      </div>
    </div>
  );
}
