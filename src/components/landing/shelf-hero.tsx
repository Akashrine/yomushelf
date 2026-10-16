"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ShelfCover } from "./shelf-3d";

// The static shelf paints first and stays the LCP element. The Three.js
// shelf loads later (see start below), and only when the device can afford
// it : no reduced motion, no data saver, WebGL available. Otherwise the
// static shelf is the whole experience.
function canRun3d(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return false;
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

export function ShelfHero({ covers }: { covers: ShelfCover[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!covers.length || !canRun3d()) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    let started = false;
    // Start on the first sign of interest, or a while after load : the
    // WebGL setup (parse, shaders, textures) then never competes with the
    // page becoming usable.
    const start = () => {
      if (started) return;
      started = true;
      import("./shelf-3d")
        .then(({ mountShelf }) => {
          if (cancelled || !canvasRef.current) return;
          cleanup = mountShelf(canvasRef.current, covers, { onReady: () => setReady(true) });
        })
        .catch(() => {});
    };
    const events = ["pointermove", "touchstart", "scroll", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, start, { once: true, passive: true }));
    const timer = window.setTimeout(start, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, start));
      cleanup?.();
    };
  }, [covers]);

  return (
    <div className="relative h-75 w-full sm:h-95 lg:h-115" aria-hidden="true">
      <div
        className="absolute inset-0 flex items-end justify-center gap-2 px-2 pb-10 transition-opacity duration-700 sm:gap-3"
        style={{ opacity: ready ? 0 : 1 }}
      >
        {covers.slice(0, 5).map((c, i) => (
          <div
            key={c.cover_url}
            className="relative aspect-2/3 w-[18%] max-w-30 overflow-hidden rounded-md shadow-lg"
            style={{ transform: `rotate(${(i - 2) * 1.5}deg)`, border: "1px solid var(--border)" }}
          >
            <Image src={c.cover_url} alt="" fill sizes="(min-width: 1024px) 120px, 18vw" priority={i < 3} className="object-cover" />
          </div>
        ))}
        <div className="absolute bottom-8 left-0 right-0 h-2 rounded-sm" style={{ background: "var(--border)" }} />
      </div>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full transition-opacity duration-700"
        style={{ opacity: ready ? 1 : 0 }}
      />
    </div>
  );
}
