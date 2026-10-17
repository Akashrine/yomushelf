"use client";

import { useState } from "react";

const INK = "#12151d";
const POP = "#ffd23f";
const WORDS = ["BAM!", "+1 TOME", "ドドド", "COLLEC'"];

// The covers band : scrolls on its own, pauses on hover, focus or with
// its button (WCAG 2.2.2), and stays still with reduced motion.
export function CoverMarquee({ covers }: { covers: { title: string; src: string }[] }) {
  const [paused, setPaused] = useState(false);
  return (
    <section aria-label="Des séries que tu peux ranger" className="manga-marquee-wrap relative overflow-hidden py-5" style={{ background: INK, transform: "rotate(-1.2deg)", margin: "0 -2rem" }}>
      <div className="manga-marquee flex w-max gap-4 px-4" style={paused ? { animationPlayState: "paused" } : undefined}>
        {[...covers, ...covers, ...covers, ...covers].map((c, i) => (
          <span key={i} className="flex items-center gap-4" aria-hidden={i >= covers.length || undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element -- already resized by the image optimizer */}
            <img src={c.src} alt={i < covers.length ? c.title : ""} width={64} height={96} loading="lazy" decoding="async" className="h-24 w-16 rounded-md object-cover" style={{ border: `2px solid ${POP}` }} />
            <span className="whitespace-nowrap font-[family-name:var(--font-bangers)] text-3xl tracking-wide" style={{ color: POP }} aria-hidden="true">
              {WORDS[i % WORDS.length]}
            </span>
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        className="absolute bottom-2 right-10 flex h-11 w-11 items-center justify-center rounded-full text-sm font-black"
        style={{ background: POP, color: INK, border: `2px solid ${INK}` }}
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          {paused ? <path d="M4 2.5v11l9-5.5z" /> : <path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" />}
        </svg>
        <span className="sr-only">{paused ? "Relancer le défilement" : "Mettre le défilement en pause"}</span>
      </button>
    </section>
  );
}
