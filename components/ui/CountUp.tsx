"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** Animated number. Counts from `from` to `to` in ~800ms (skipped with reduced motion). */
export function CountUp({
  to,
  from = 0,
  format = (n) => Math.round(n).toLocaleString("en-US"),
  duration = 0.8,
  delay = 0,
  onDone,
  ease = [0.16, 1, 0.3, 1],
}: {
  to: number;
  from?: number;
  format?: (n: number) => string;
  duration?: number;
  delay?: number;
  onDone?: () => void;
  ease?: "linear" | [number, number, number, number];
}) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(from);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    if (reduce) {
      doneRef.current?.();
      return;
    }
    const controls = animate(from, to, {
      duration,
      delay,
      ease,
      onUpdate: setValue,
      onComplete: () => doneRef.current?.(),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, duration, delay, reduce]);

  return <>{format(reduce ? to : value)}</>;
}

export const money0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
export const money2 = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
