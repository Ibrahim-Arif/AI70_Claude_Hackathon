"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";

/**
 * A compass rose rendered as a halftone dot grid: dot radius follows the
 * "ink density" of an 8-point star at that location.
 */
export function HalftoneCompass({
  size = 220,
  color = "#000000",
  accent,
  spin = false,
  className = "",
}: {
  size?: number;
  color?: string;
  /** optional second color for the outer ring dots */
  accent?: string;
  spin?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const dots = useMemo(() => {
    const out: { x: number; y: number; r: number; ring: boolean }[] = [];
    const N = 29;
    const step = 100 / N;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = (i + 0.5) * step - 50;
        const y = (j + 0.5) * step - 50;
        const d = Math.hypot(x, y);
        if (d > 49) continue;
        const a = Math.atan2(y, x);
        // 4 long points + 4 short points
        const k4 = Math.abs(Math.cos(2 * a));
        const k8 = Math.abs(Math.cos(2 * a + Math.PI / 2));
        const longR = 8 + 40 * Math.pow(k4, 18);
        const shortR = 8 + 24 * Math.pow(k8, 14);
        const starR = Math.max(longR, shortR);
        let density = 0;
        let ring = false;
        if (d < starR) density = 1 - (d / starR) * 0.55;
        // outer ring
        if (Math.abs(d - 46) < 1.8 && density < 0.55) {
          density = 0.55;
          ring = true;
        }
        // inner ring
        if (Math.abs(d - 30) < 0.9) density = Math.max(density, 0.25);
        if (density <= 0.05) continue;
        out.push({ x: x + 50, y: y + 50, r: (step / 2) * Math.min(1, density) * 0.92, ring });
      }
    }
    return out;
  }, []);

  return (
    <motion.svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden
      className={className}
      animate={spin && !reduce ? { rotate: 360 } : undefined}
      transition={spin ? { duration: 24, repeat: Infinity, ease: "linear" } : undefined}
    >
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.ring && accent ? accent : color} />
      ))}
    </motion.svg>
  );
}
