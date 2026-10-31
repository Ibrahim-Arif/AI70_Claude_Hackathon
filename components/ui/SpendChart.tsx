"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState, type PointerEvent } from "react";

const W = 340;
const H = 168;
const PAD = { l: 4, r: 8, t: 10, b: 22 };

/**
 * Month-to-date line from real daily totals, against last month as a dashed ghost.
 * Drag across it to read any day. No smoothing: spending arrives in jumps.
 */
export function SpendChart({
  values,
  prior,
  format,
  monthLabel = "Oct",
}: {
  values: number[];
  prior: number[];
  format: (n: number) => string;
  monthLabel?: string;
}) {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState<number | null>(null);
  const n = values.length;
  const max = Math.max(...values, ...prior, 1) * 1.08;
  const x = (i: number) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const path = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${path(values)} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const shown = idx ?? n - 1;

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = (e.clientX - r.left) / r.width;
    setIdx(Math.min(n - 1, Math.max(0, Math.round(((f * W - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1)))));
  };

  return (
    <div className="mt-4">
      <p className="mb-1 flex items-baseline justify-between font-serif text-caption text-ink-2" aria-live="polite">
        <span>{monthLabel} {String(shown + 1).padStart(2, "0")}</span>
        <span className="num text-label text-black">{format(values[shown])}</span>
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="block touch-pan-y select-none"
        role="img"
        aria-label={`Cumulative month-to-date chart, ${format(values[n - 1])} so far`}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setIdx(null)}
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={PAD.l} x2={W - PAD.r} y1={y(max * f * 0.92)} y2={y(max * f * 0.92)} stroke="#E4E2DD" strokeWidth={1} strokeDasharray="2 4" />
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke="#D6D3CC" strokeWidth={1.2} />
        <path d={`${path(prior)} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="#EDEBE7" opacity={0.7} />
        <path d={path(prior)} fill="none" stroke="#B9B6AE" strokeWidth={1.4} strokeDasharray="3 3" />
        <motion.path d={area} fill="url(#spendfill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 0.6, duration: 0.4 }} />
        <motion.path
          d={path(values)}
          fill="none"
          stroke="#1D3BC4"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="spendfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1D3BC4" stopOpacity={0.14} />
            <stop offset="100%" stopColor="#1D3BC4" stopOpacity={0} />
          </linearGradient>
        </defs>
        {idx !== null && <line x1={x(shown)} x2={x(shown)} y1={PAD.t} y2={y(0)} stroke="#1D3BC4" strokeWidth={1} opacity={0.35} />}
        <circle cx={x(shown)} cy={y(values[shown])} r={5.5} fill="#fff" stroke="#1D3BC4" strokeWidth={3} />
        {[1, 7, 14, 21, 28].map((d) => (
          <text key={d} x={x(d - 1)} y={H - 5} textAnchor="middle" fontSize={11} fill="#75726B" style={{ fontFamily: "var(--font-num)", fontWeight: 700 }}>
            {String(d).padStart(2, "0")}
          </text>
        ))}
      </svg>
    </div>
  );
}
