"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronRight } from "./icons";

const TONES = {
  white: "border-hairline bg-white",
  royal: "border-royal bg-royal text-white",
  sky: "border-sky-tint bg-sky-tint",
  amber: "border-amber-tint bg-amber-tint",
  coral: "border-coral-tint bg-coral-tint",
};

export function Card({
  children,
  onClick,
  footer,
  className = "",
  tone = "white",
}: {
  children: ReactNode;
  onClick?: () => void;
  footer?: ReactNode;
  className?: string;
  /** royal = full-color hero card with white text; tints for softer accents */
  tone?: "white" | "royal" | "sky" | "amber" | "coral";
  /** @deprecated accessible name comes from the card's text */
  ariaLabel?: string;
}) {
  const body = <div className="p-[22px]">{children}</div>;
  return (
    <motion.div
      className={`overflow-hidden rounded-card border ${TONES[tone]} ${className}`}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {onClick ? (
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick();
            }
          }}
          className="block w-full cursor-pointer text-left"
        >
          {body}
        </div>
      ) : (
        body
      )}
      {footer && (
        <div
          className={`flex min-h-12 items-center justify-between gap-3 px-[22px] py-2 ${
            tone === "royal" ? "bg-black/20" : tone === "white" ? "bg-fill" : "bg-white/60"
          }`}
        >
          {footer}
        </div>
      )}
    </motion.div>
  );
}

export function CardHeader({
  label,
  chevron = true,
  extra,
  onDark = false,
}: {
  label: string;
  chevron?: boolean;
  extra?: ReactNode;
  onDark?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`caps flex items-center gap-2 text-label ${onDark ? "text-white" : "text-black"}`}>
        {label}
        {extra}
      </span>
      {chevron && <ChevronRight size={20} className={onDark ? "text-white" : "text-black"} />}
    </div>
  );
}

export function NewPill() {
  return <span className="caps rounded-full bg-royal px-2 py-0.5 text-micro text-white">New</span>;
}

/** Arrow in a tinted circle. tone: good (royal), bad (coral), or onDark for the royal card. */
export function Delta({
  direction,
  value,
  caption,
  tone = "good",
  onDark = false,
}: {
  direction: "up" | "down";
  value: string;
  caption: string;
  tone?: "good" | "bad";
  onDark?: boolean;
}) {
  const Icon = direction === "up" ? ArrowUp : ArrowDown;
  const circle = onDark
    ? tone === "bad"
      ? "bg-coral-tint text-conflicts"
      : "bg-white text-royal"
    : tone === "bad"
      ? "bg-coral-tint text-conflicts"
      : "bg-royal-tint text-royal";
  return (
    <div className="mt-3 flex items-center gap-2">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${circle}`}>
        <Icon size={16} strokeWidth={2.4} />
      </span>
      <span className={`num whitespace-nowrap text-label ${onDark ? "text-white" : "text-black"}`}>{value}</span>
      <span className={`font-serif text-caption ${onDark ? "text-white" : "text-ink-2"}`}>{caption}</span>
    </div>
  );
}

/** Sky line with sky-tint fill; draws in with pathLength. */
export function Sparkline({ values, height = 56 }: { values: number[]; height?: number }) {
  const reduce = useReducedMotion();
  const w = 300;
  const h = height;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 4 - (v / max) * (h - 8)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden className="mt-4 block">
      <motion.path
        d={area}
        fill="var(--sky-tint)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: reduce ? 0 : 0.7 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke="var(--sky)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: reduce ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: "easeOut", delay: 0.2 }}
      />
    </svg>
  );
}

/** 10px pill: Aligned / Mixed / Conflicts widths. Animates on change. */
export function StackedBar({
  aligned,
  mixed,
  conflicts,
  onDark = false,
}: {
  aligned: number;
  mixed: number;
  conflicts: number;
  onDark?: boolean;
}) {
  const total = aligned + mixed + conflicts || 1;
  const seg = (v: number) => `${(v / total) * 100}%`;
  const spring = { type: "spring" as const, stiffness: 400, damping: 34 };
  return (
    <div
      className="mt-4 flex h-2.5 w-full gap-[3px] overflow-hidden rounded-full"
      role="img"
      aria-label={`Aligned ${Math.round((aligned / total) * 100)}%, Mixed ${Math.round((mixed / total) * 100)}%, Conflicts ${Math.round((conflicts / total) * 100)}%`}
    >
      <motion.div className={`h-full rounded-full ${onDark ? "bg-white" : "bg-aligned"}`} initial={{ width: 0 }} animate={{ width: seg(aligned) }} transition={spring} />
      <motion.div className="h-full rounded-full bg-mixed" initial={{ width: 0 }} animate={{ width: seg(mixed) }} transition={spring} />
      <motion.div className="h-full rounded-full bg-conflicts" initial={{ width: 0 }} animate={{ width: seg(conflicts) }} transition={spring} />
    </div>
  );
}
