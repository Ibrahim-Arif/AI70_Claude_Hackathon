"use client";

import { motion } from "motion/react";
import { forwardRef } from "react";
import type { GenericSummary, Label } from "@/lib/types";
import { Check } from "./icons";
import { GenericWord, StatusMarker } from "./Status";
import { money2 } from "./CountUp";

export function Monogram({ name, size = 44 }: { name: string; size?: number }) {
  const letter = name.replace(/[^A-Za-z]/g, "").charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="caps flex shrink-0 items-center justify-center rounded-full bg-icon-tile text-row text-black"
    >
      {letter}
    </span>
  );
}

type Props = {
  name: string;
  ownedBy?: string;
  amount: number;
  label?: Label;
  generic?: GenericSummary;
  supportsLocal?: boolean;
  kept?: boolean;
  pulse?: boolean;
  onClick?: () => void;
};

export const MerchantRow = forwardRef<HTMLButtonElement, Props>(function MerchantRow(
  { name, ownedBy, amount, label, generic, supportsLocal, kept, pulse, onClick },
  ref,
) {
  const caption = ownedBy ? `Owned by ${ownedBy}` : null;
  return (
    <motion.button
      ref={ref}
      type="button"
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={
        pulse
          ? { opacity: 1, y: 0, backgroundColor: ["#FFFFFF", "#E3ECFA", "#FFFFFF", "#E3ECFA", "#FFFFFF"] }
          : { opacity: 1, y: 0, backgroundColor: "#FFFFFF" }
      }
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{
        opacity: { duration: 0.25, ease: "easeOut" },
        y: { type: "spring", stiffness: 400, damping: 34 },
        backgroundColor: { duration: pulse ? 1.6 : 0.2 },
        layout: { type: "spring", stiffness: 400, damping: 34 },
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex min-h-[76px] w-full items-center gap-3.5 rounded-row bg-white px-4 py-3 text-left"
    >
      <Monogram name={name} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="caps text-label text-black">
          {name.split(" ").map((w, i) => (
            <span key={i} className="whitespace-nowrap">
              {i ? " " : ""}
              {w}
            </span>
          ))}
        </span>
        {caption && <span className="truncate font-serif text-caption text-ink-2">{caption}</span>}
        {supportsLocal && (
          <span className="flex items-center gap-1 font-serif text-caption text-ink-2">
            <Check size={14} strokeWidth={2.4} className="text-royal" /> Supports local
          </span>
        )}
        {kept && <span className="font-serif text-caption text-ink-2">Kept</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="num text-label text-black">{money2(amount)}</span>
        {label && <StatusMarker label={label} />}
        {!label && generic && <GenericWord word={generic} />}
      </span>
    </motion.button>
  );
});
