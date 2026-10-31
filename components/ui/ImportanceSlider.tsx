"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export const LEVEL_COLORS = {
  nice: "#3199DD",
  important: "#3171DD",
  dealbreaker: "#E05A2B",
} as const;

type Option<T extends string> = { value: T; label: string };

const SPRING = { type: "spring" as const, stiffness: 400, damping: 34 };

/**
 * Snapping slider for importance. Drag the thumb (or tap anywhere on it)
 * and it settles on the nearest stop. The value only commits on release,
 * so the Values tab recomputes once per change.
 */
export function ImportanceSlider<T extends keyof typeof LEVEL_COLORS>({
  options,
  value,
  onChange,
  onPreview,
  ariaLabel,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  /** fires while dragging with the stop the thumb would land on */
  onPreview?: (v: T | null) => void;
  ariaLabel: string;
}) {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const n = options.length;
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const frac = drag ?? idx / (n - 1);
  const shown = drag === null ? idx : Math.round(drag * (n - 1));
  const color = LEVEL_COLORS[options[shown].value];

  const fracFrom = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return idx / (n - 1);
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const commit = (i: number) => {
    const next = options[Math.min(n - 1, Math.max(0, i))].value;
    if (next !== value) onChange(next);
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const f = fracFrom(e.clientX);
    setDrag(f);
    onPreview?.(options[Math.round(f * (n - 1))].value);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag === null) return;
    const f = fracFrom(e.clientX);
    setDrag(f);
    onPreview?.(options[Math.round(f * (n - 1))].value);
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (drag === null) return;
    const i = Math.round(fracFrom(e.clientX) * (n - 1));
    setDrag(null);
    onPreview?.(null);
    commit(i);
  };
  const onCancel = () => {
    setDrag(null);
    onPreview?.(null);
  };

  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
    if (e.key in map) {
      e.preventDefault();
      commit(idx + map[e.key]);
    } else if (e.key === "Home") {
      e.preventDefault();
      commit(0);
    } else if (e.key === "End") {
      e.preventDefault();
      commit(n - 1);
    }
  };

  const move = drag === null && !reduce ? SPRING : { duration: 0 };

  return (
    <div
      className="relative cursor-pointer select-none touch-pan-y px-[15px]"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onCancel}
    >
      {/* track */}
      <div ref={trackRef} className="relative h-11">
        <div className="absolute inset-x-[-15px] top-1/2 h-2 -translate-y-1/2 rounded-full bg-fill" />
        <motion.div
          className="absolute left-[-15px] top-1/2 h-2 -translate-y-1/2 rounded-full"
          initial={false}
          animate={{ width: `calc(${frac * 100}% + 15px)`, backgroundColor: color }}
          transition={{ width: move, backgroundColor: { duration: 0.25 } }}
        />
        {options.map((o, i) => (
          <span
            key={o.value}
            aria-hidden
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-200"
            style={{ left: `${(i / (n - 1)) * 100}%`, backgroundColor: i <= shown ? "#FFFFFF" : "#DDD5C6" }}
          />
        ))}
        <motion.div
          role="slider"
          tabIndex={0}
          aria-label={ariaLabel}
          aria-valuemin={0}
          aria-valuemax={n - 1}
          aria-valuenow={idx}
          aria-valuetext={options[idx].label}
          onKeyDown={onKey}
          className="absolute top-1/2 h-[30px] w-[30px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.18)] outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          style={{ x: "-50%", y: "-50%", borderWidth: 3, borderStyle: "solid" }}
          initial={false}
          animate={{ left: `${frac * 100}%`, borderColor: color, scale: drag === null ? 1 : 1.12 }}
          transition={{ left: move, borderColor: { duration: 0.25 }, scale: SPRING }}
        />
      </div>
      {/* stop labels, aligned under each stop */}
      <div className="relative mt-1 h-5" aria-hidden>
        {options.map((o, i) => {
          const edge = i === 0 ? "0%" : i === n - 1 ? "-100%" : "-50%";
          const pad = i === 0 ? "-15px" : i === n - 1 ? "15px" : "0px";
          return (
            <span
              key={o.value}
              className={`caps absolute top-0 whitespace-nowrap text-micro transition-colors duration-200 ${
                i === shown ? "text-black" : "text-ink-2"
              }`}
              style={{ left: `calc(${(i / (n - 1)) * 100}% + ${pad})`, transform: `translateX(${edge})` }}
            >
              {o.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
