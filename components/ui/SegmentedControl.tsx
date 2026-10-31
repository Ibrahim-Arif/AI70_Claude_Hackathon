"use client";

import { motion } from "motion/react";
import { useId } from "react";

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex h-12 w-full rounded-full bg-fill p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <motion.button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(o.value)}
            className="caps relative min-h-10 flex-1 rounded-full text-seg tracking-[0.02em] text-black"
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
