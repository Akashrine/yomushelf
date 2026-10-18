"use client";

import { useEffect, useRef } from "react";
import { currentSource } from "@/lib/analytics";

// Hidden form field carrying the visit's source to a server action, so the
// account created can be attributed to its channel (tiktok, instagram…).
export function SourceField() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.value = currentSource() ?? "";
  }, []);
  return <input ref={ref} type="hidden" name="src" defaultValue="" />;
}
