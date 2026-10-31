"use client";

import { LayoutGroup, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackButton, PrimaryButton } from "@/components/ui/Buttons";
import { Plus, Sparkle, VALUE_ICONS } from "@/components/ui/icons";
import { SelectionRow } from "@/components/ui/SelectionRow";
import { useApp, useUI } from "@/lib/store";
import { CATALOG } from "@/lib/values";

export default function ValuesPage() {
  const router = useRouter();
  const selectedIds = useApp((s) => s.selectedIds);
  const customs = useApp((s) => s.customs);
  const toggle = useApp((s) => s.toggleValue);
  const set = useApp((s) => s.set);
  const openSheet = useUI((s) => s.openSheet);

  return (
    <Screen
      footer={
        <div className="flex flex-col items-center gap-2">
          <PrimaryButton
            disabled={selectedIds.length === 0}
            onClick={() => {
              set({ mode: "values" });
              router.push("/importance");
            }}
          >
            Continue
          </PrimaryButton>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              set({ mode: "generic" });
              router.push("/link");
            }}
            className="min-h-11 px-4 font-serif text-body text-ink-2 underline underline-offset-4"
          >
            Skip for now
          </motion.button>
        </div>
      }
    >
      <BackButton />
      <h1 className="head mt-3 text-h1 text-black">What do you care about?</h1>
      <p className="mt-3 font-serif text-body text-ink-2">Optional. Pick any. Change it anytime.</p>
      <LayoutGroup>
        <motion.div layout className="mt-8 flex flex-col gap-3">
          {CATALOG.map((c) => {
            const Icon = VALUE_ICONS[c.icon];
            return (
              <SelectionRow
                key={c.id}
                layout
                icon={<Icon size={24} />}
                label={c.rowLabel}
                selected={selectedIds.includes(c.id)}
                onToggle={() => toggle(c.id)}
              />
            );
          })}
          {customs.map((c) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
            >
              <SelectionRow
                icon={<Sparkle size={22} />}
                label={c.label}
                caption={c.type === "unsupported" ? "In your words. Not tracked yet." : "In your words."}
                selected={selectedIds.includes(c.id)}
                onToggle={() => toggle(c.id)}
              />
            </motion.div>
          ))}
          <SelectionRow layout dashed icon={<Plus size={22} />} label="Add your own" onToggle={() => openSheet({ type: "add" })} />
        </motion.div>
      </LayoutGroup>
    </Screen>
  );
}
