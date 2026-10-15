"use client";

import { useEffect, useMemo } from "react";

const COLORS = ["#f8c04a", "#ff6a3d", "#9b8cff", "#5ec8f2", "#ff8fb1", "#ffffff"];
const PIECES = 28;

type Props = {
  message: string;
  sub?: string;
  onDone: () => void;
};

// Confetti burst + message pill. Purely decorative feedback after an action.
export function Celebration({ message, sub, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => {
        const angle = (i / PIECES) * Math.PI * 2 + (i % 3) * 0.2;
        const dist = 90 + ((i * 37) % 90);
        return {
          color: COLORS[i % COLORS.length],
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist - 40,
          rot: ((i * 83) % 720) - 360,
          w: 6 + (i % 3) * 3,
          h: i % 2 ? 10 : 6,
          delay: (i % 5) * 30,
        };
      }),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" role="status" aria-live="polite">
      <div className="absolute left-1/2 top-[42%]">
        {pieces.map((p, i) => (
          <span
            key={i}
            className="confetti-piece absolute rounded-[2px]"
            style={
              {
                width: p.w,
                height: p.h,
                background: p.color,
                animationDelay: `${p.delay}ms`,
                "--dx": `${p.dx}px`,
                "--dy": `${p.dy}px`,
                "--rot": `${p.rot}deg`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div
        className="pop-in absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 rounded-2xl px-5 py-3 text-center shadow-2xl"
        style={{
          background: "linear-gradient(135deg, #2a1d1a 0%, #1c1414 100%)",
          border: "1px solid rgba(248,192,74,0.45)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(248,192,74,0.18)",
          minWidth: 220,
        }}
      >
        <p className="text-base font-bold">{message}</p>
        {sub && (
          <p className="mt-0.5 text-sm font-semibold text-gold-gradient">{sub}</p>
        )}
      </div>
    </div>
  );
}
