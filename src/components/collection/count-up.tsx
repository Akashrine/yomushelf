"use client";

import { useEffect, useState } from "react";
import { formatEur } from "@/lib/collection/value";

type Props = {
  value: number; // euros
  durationMs?: number;
  className?: string;
};

const format = (n: number) => formatEur(n);

// Rolls an euro amount up from 0 on mount. Screen readers get the final value only.
export function CountUp({ value, durationMs = 1400, className }: Props) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : durationMs;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(value * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return (
    <span className={className}>
      <span aria-hidden="true">{format(display)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
