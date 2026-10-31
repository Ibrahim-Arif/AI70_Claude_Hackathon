"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PrimaryButton } from "../ui/Buttons";
import { money0 } from "../ui/CountUp";
import { Check } from "../ui/icons";
import { SegmentedControl } from "../ui/SegmentedControl";
import { merchantById, merchants, parentById } from "@/data/merchants";
import { useApp, useUI } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";

const TARGETS = [
  { value: 50, label: "$50" },
  { value: 100, label: "$100" },
  { value: 150, label: "$150" },
];

export function GoalSheet({ merchantId }: { merchantId: string }) {
  const router = useRouter();
  const d = useDerived();
  const set = useApp((s) => s.set);
  const { closeSheet, showToast } = useUI();
  const [target, setTarget] = useState(100);
  const [saved, setSaved] = useState(false);

  const m = merchantById[merchantId];
  const parent = parentById[m.parentId];
  const group = merchants.filter((x) => x.parentId === m.parentId && d.spend[x.id]);
  const total = Math.round(group.reduce((s, x) => s + (d.spend[x.id] ?? 0), 0) * 100) / 100;
  const others = group.filter((x) => x.id !== m.parentId && x.name !== parent.name);
  const includes = others.length
    ? `Includes ${others.map((o) => o.name).join(" and ")}. `
    : "";

  const save = () => {
    setSaved(true);
    setTimeout(() => {
      set({
        goal: {
          id: `goal-${m.parentId}`,
          label: group.map((g) => g.name).join(" + "),
          merchantIds: group.map((g) => g.id),
          baseline: total,
          target,
        },
      });
      closeSheet();
      router.push("/home");
      showToast("Goal saved. We'll start tracking in November.");
    }, 850);
  };

  return (
    <div className="pt-2">
      <h2 className="head text-h2 text-black">Move spending away from {parent.name}</h2>
      <p className="mt-3 font-serif text-body text-ink-2">
        {includes}Now {money0(total)} a month.
      </p>
      <p className="caps mb-3 mt-8 text-label text-black">Target</p>
      <SegmentedControl ariaLabel="Monthly target" options={TARGETS} value={target} onChange={setTarget} />
      <p className="mt-3 font-serif text-caption text-ink-2">Under {money0(target)} a month, starting in November.</p>
      <PrimaryButton className="mt-8" onClick={save} disabled={saved} aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {saved ? (
            <motion.span
              key="ok"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-royal"
            >
              <Check size={20} strokeWidth={2.8} />
              <span className="sr-only">Saved</span>
            </motion.span>
          ) : (
            <motion.span key="label" exit={{ opacity: 0 }}>
              Save goal
            </motion.span>
          )}
        </AnimatePresence>
      </PrimaryButton>
    </div>
  );
}
