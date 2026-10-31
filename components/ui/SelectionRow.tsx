"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { Check } from "./icons";

export function SelectionRow({
  icon,
  label,
  caption,
  selected,
  onToggle,
  dashed = false,
  layout = false,
}: {
  icon: ReactNode;
  label: string;
  caption?: string;
  selected?: boolean;
  onToggle: () => void;
  dashed?: boolean;
  layout?: boolean;
}) {
  return (
    <motion.button
      type="button"
      layout={layout ? "position" : undefined}
      role={dashed ? undefined : "checkbox"}
      aria-checked={dashed ? undefined : !!selected}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      className={`relative flex min-h-[84px] w-full items-center gap-4 rounded-row px-5 text-left ${
        dashed ? "border-2 border-dashed border-royal/50 bg-transparent" : selected ? "bg-royal-tint" : "bg-white"
      } transition-colors duration-200`}
    >
      <span
        className={`pointer-events-none absolute inset-0 rounded-row border-2 transition-colors duration-200 ${
          selected ? "border-royal" : dashed ? "border-transparent" : "border-hairline"
        }`}
      />
      {icon}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="caps text-row text-black">{label}</span>
        {caption && <span className="font-serif text-caption text-ink-2">{caption}</span>}
      </span>
      <AnimatePresence>
        {selected && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-royal text-white"
          >
            <Check size={16} strokeWidth={2.6} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
