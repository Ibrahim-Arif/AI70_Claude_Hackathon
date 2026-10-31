"use client";

import { useRef } from "react";
import { useUI } from "@/lib/store";

/** "Tally" wordmark. Triple-tap opens the demo presenter panel. */
export function Wordmark({ light = false, large = false }: { light?: boolean; large?: boolean }) {
  const taps = useRef<number[]>([]);
  const open = useUI((s) => s.openSheet);
  return (
    <button
      type="button"
      aria-label="Tally"
      onClick={() => {
        const now = Date.now();
        taps.current = [...taps.current.filter((t) => now - t < 700), now];
        if (taps.current.length >= 3) {
          taps.current = [];
          open({ type: "demo" });
        }
      }}
      className={`-ml-0.5 min-h-11 select-none font-display ${large ? "text-[44px] leading-[44px]" : "text-[28px] leading-8"} tracking-[-0.02em] ${light ? "text-white" : "text-royal"}`}
    >
      Tally
    </button>
  );
}
