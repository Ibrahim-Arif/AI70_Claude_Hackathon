"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ImportanceSlider } from "./ui/ImportanceSlider";
import { ValueIcon } from "./ui/ValueIcon";
import { farScoreFor, levelOf, weightOf } from "@/lib/engine";
import { useApp, useProfile } from "@/lib/store";
import { isPreferRule } from "@/lib/values";

function caption(weight: number, prefer: boolean): string {
  const level = levelOf(weight);
  if (prefer) {
    return level === "nice"
      ? "We'll quietly note local places you already support."
      : "We'll point out local places you already support.";
  }
  if (level === "nice") return "We'll mention it, but won't flag anything.";
  if (level === "dealbreaker") return "We'll flag any company that falls short as a Conflict.";
  return `We'll mark companies that fall short as Mixed, and ones that score under ${farScoreFor(weight)} out of 100 as Conflicts.`;
}

export function ImportanceBlocks({
  onWeight,
  onRemove,
}: {
  onWeight?: (id: string, weight: number) => void;
  onRemove?: (id: string) => void;
}) {
  const profile = useProfile();
  const setWeight = useApp((s) => s.setWeight);
  const change = onWeight ?? setWeight;
  const [preview, setPreview] = useState<{ id: string; v: number } | null>(null);

  return (
    <div className="flex flex-col">
      <AnimatePresence initial={false}>
        {profile.preferences.map((p) => {
          const prefer = isPreferRule(p);
          const unsupported = p.type === "unsupported";
          const weight = preview?.id === p.id ? preview.v : weightOf(p);
          const text = unsupported ? "Not tracked yet. We'll tell you when we have reliable data." : caption(weight, prefer);
          return (
            <motion.section
              key={p.id}
              layout="position"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
              className="pb-7"
            >
              <div className="mb-2 flex min-h-11 items-center gap-3">
                <ValueIcon id={p.id} size={36} />
                <h2 className="caps flex-1 text-label text-black">{p.label}</h2>
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(p.id)}
                    aria-label={`Remove ${p.label}`}
                    className="min-h-11 px-1 font-serif text-caption text-ink-2 underline underline-offset-4"
                  >
                    Remove
                  </button>
                )}
              </div>
              {!unsupported && (
                <ImportanceSlider
                  ariaLabel={`How much ${p.label} matters`}
                  value={weightOf(p)}
                  onChange={(v) => change(p.id, v)}
                  onPreview={(v) => setPreview(v === null ? null : { id: p.id, v })}
                />
              )}
              <div className="relative mt-2 min-h-[42px]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={text}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                    className="font-serif text-caption text-ink-2"
                  >
                    {text}
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.section>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
