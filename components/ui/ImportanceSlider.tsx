"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { levelOf } from "@/lib/engine";

export const LEVEL_COLORS = {
  nice: "#2D6FD6",
  important: "#1D3BC4",
  dealbreaker: "#E05A2B",
} as const;

/** Reference marks. They label the track; they are not ranges or snap points. */
const MARKS = [
  { at: 0, label: "Nice" },
  { at: 50, label: "Important" },
  { at: 100, label: "Dealbreaker" },
];

const SPRING = { type: "spring" as const, stiffness: 400, damping: 34 };
const clamp = (n: number) => Math.min(100, Math.max(0, n));

/**
 * Free-sliding importance, 0 to 100. Drag anywhere; nothing snaps. The value
 * commits on release so the Values tab recomputes once per change.
 */
export function ImportanceSlider({
  value,
  onChange,
  onPreview,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  /** fires while dragging with the live value, then null on release */
  onPreview?: (v: number | null) => void;
  ariaLabel: string;
}) {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? value;
  const color = LEVEL_COLORS[levelOf(shown)];

  const valueFrom = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return value;
    return clamp(((clientX - rect.left) / rect.width) * 100);
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const v = valueFrom(e.clientX);
    setDrag(v);
    onPreview?.(v);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag === null) return;
    const v = valueFrom(e.clientX);
    setDrag(v);
    onPreview?.(v);
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (drag === null) return;
    const v = Math.round(valueFrom(e.clientX));
    setDrag(null);
    onPreview?.(null);
    if (v !== Math.round(value)) onChange(v);
  };
  const onCancel = () => {
    setDrag(null);
    onPreview?.(null);
  };

  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 5;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? value + step
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? value - step
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? 100
              : null;
    if (next === null) return;
    e.preventDefault();
    onChange(Math.round(clamp(next)));
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
      <div ref={trackRef} className="relative h-11">
        <div className="absolute inset-x-[-15px] top-1/2 h-2 -translate-y-1/2 rounded-full bg-fill" />
        <motion.div
          className="absolute left-[-15px] top-1/2 h-2 -translate-y-1/2 rounded-full"
          initial={false}
          animate={{ width: `calc(${shown}% + 15px)`, backgroundColor: color }}
          transition={{ width: move, backgroundColor: { duration: 0.25 } }}
        />
        {MARKS.map((m) => (
          <span
            key={m.label}
            aria-hidden
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${m.at}%`, backgroundColor: m.at <= shown ? "#FFFFFF" : "#D6D3CC" }}
          />
        ))}
        <motion.div
          role="slider"
          tabIndex={0}
          aria-label={ariaLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(value)}
          aria-valuetext={`${Math.round(value)} out of 100`}
          onKeyDown={onKey}
          className="absolute top-1/2 h-[30px] w-[30px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.18)] outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          style={{ x: "-50%", y: "-50%", borderWidth: 3, borderStyle: "solid" }}
          initial={false}
          animate={{ left: `${shown}%`, borderColor: color, scale: drag === null ? 1 : 1.12 }}
          transition={{ left: move, borderColor: { duration: 0.25 }, scale: SPRING }}
        />
      </div>
      <div className="relative mt-1 h-5" aria-hidden>
        {MARKS.map((m, i) => {
          const edge = i === 0 ? "0%" : i === MARKS.length - 1 ? "-100%" : "-50%";
          const pad = i === 0 ? "-15px" : i === MARKS.length - 1 ? "15px" : "0px";
          return (
            <span
              key={m.label}
              className="caps absolute top-0 whitespace-nowrap text-micro text-ink-2"
              style={{ left: `calc(${m.at}% + ${pad})`, transform: `translateX(${edge})` }}
            >
              {m.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
