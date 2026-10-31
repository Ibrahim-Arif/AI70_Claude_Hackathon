"use client";

import { AnimatePresence, motion } from "motion/react";
import { SegmentedControl } from "./ui/SegmentedControl";
import { useApp, useProfile } from "@/lib/store";
import type { Importance, PriceBudget } from "@/lib/types";
import { isPreferRule } from "@/lib/values";

const CAPTIONS: Record<Importance, string> = {
  nice: "We'll mention it, but won't flag anything.",
  important: "We'll mark companies that fall short as Mixed.",
  dealbreaker: "We'll flag any company that falls short.",
};

const THREE = [
  { value: "nice" as const, label: "Nice" },
  { value: "important" as const, label: "Important" },
  { value: "dealbreaker" as const, label: "Dealbreaker" },
];
const TWO = [
  { value: "nice" as const, label: "Nice" },
  { value: "important" as const, label: "Important" },
];
const BUDGET = [
  { value: 0 as const, label: "0%" },
  { value: 5 as const, label: "+5%" },
  { value: 10 as const, label: "+10%" },
  { value: 20 as const, label: "+20%" },
];

export function ImportanceBlocks({
  onImportance,
  onBudget,
  onRemove,
}: {
  onImportance?: (id: string, imp: Importance) => void;
  onBudget?: (pct: PriceBudget) => void;
  onRemove?: (id: string) => void;
}) {
  const profile = useProfile();
  const setImportance = useApp((s) => s.setImportance);
  const set = useApp((s) => s.set);
  const budget = useApp((s) => s.maxPriceIncreasePct);
  const changeImp = onImportance ?? setImportance;
  const changeBudget = onBudget ?? ((pct: PriceBudget) => set({ maxPriceIncreasePct: pct }));

  return (
    <div className="flex flex-col">
      <AnimatePresence initial={false}>
        {profile.preferences.map((p) => {
          const prefer = isPreferRule(p);
          const unsupported = p.type === "unsupported";
          const caption = unsupported
            ? "Not tracked yet. We'll tell you when we have reliable data."
            : prefer
              ? "We'll point out local places you already support."
              : CAPTIONS[p.importance];
          return (
            <motion.section
              key={p.id}
              layout="position"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
              className="pb-8"
            >
              <div className="mb-3 flex min-h-6 items-center justify-between gap-3">
                <h2 className="caps text-label text-black">{p.label}</h2>
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(p.id)}
                    aria-label={`Remove ${p.label}`}
                    className="-my-3 min-h-11 px-1 font-serif text-caption text-ink-2 underline underline-offset-4"
                  >
                    Remove
                  </button>
                )}
              </div>
              {!unsupported && (
                <SegmentedControl
                  ariaLabel={`How much ${p.label} matters`}
                  options={prefer ? TWO : THREE}
                  value={prefer && p.importance === "dealbreaker" ? "important" : p.importance}
                  onChange={(v) => changeImp(p.id, v)}
                />
              )}
              <div className="relative mt-3 min-h-[42px]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={caption}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="font-serif text-caption text-ink-2"
                  >
                    {caption}
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.section>
          );
        })}
      </AnimatePresence>
      <motion.div layout="position" className="border-t border-hairline pt-8">
        <h2 className="caps mb-3 text-label text-black">I&apos;d pay up to</h2>
        <SegmentedControl ariaLabel="Price increase you'd accept" options={BUDGET} value={budget} onChange={changeBudget} />
        <p className="mt-3 font-serif text-caption text-ink-2">More than you spend now, when we suggest alternatives.</p>
      </motion.div>
    </div>
  );
}
