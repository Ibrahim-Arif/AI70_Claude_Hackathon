"use client";

import { LayoutGroup, motion } from "motion/react";
import { ImportanceBlocks } from "@/components/ImportanceBlocks";
import { Screen } from "@/components/Screen";
import { Plus, Sparkle, VALUE_ICONS } from "@/components/ui/icons";
import { SelectionRow } from "@/components/ui/SelectionRow";
import { changeValues } from "@/lib/notify";
import { useApp, useUI } from "@/lib/store";
import { CATALOG } from "@/lib/values";

export default function ValuesTab() {
  const selectedIds = useApp((s) => s.selectedIds);
  const customs = useApp((s) => s.customs);
  const generic = useApp((s) => s.mode === "generic");
  const openSheet = useUI((s) => s.openSheet);

  const toggle = (id: string) =>
    changeValues(() => {
      const s = useApp.getState();
      if (generic) s.set({ mode: "values" });
      s.toggleValue(id);
    }, "Saved");

  const unselectedCatalog = generic ? CATALOG : CATALOG.filter((c) => !selectedIds.includes(c.id));
  const unselectedCustoms = generic ? customs : customs.filter((c) => !selectedIds.includes(c.id));

  return (
    <Screen tabs>
      <h1 className="head mt-2 text-h2 text-black">Your values</h1>
      <p className="mt-2 font-serif text-body text-ink-2">
        {generic ? "Pick what matters to you to see labels on your spending." : "Changes apply right away."}
      </p>

      <LayoutGroup>
        {!generic && (
          <motion.div layout className="mt-8">
            <ImportanceBlocks
              onImportance={(id, imp) => changeValues(() => useApp.getState().setImportance(id, imp))}
              onBudget={(pct) => {
                useApp.getState().set({ maxPriceIncreasePct: pct });
                useUI.getState().showToast(`Alternatives now show options within +${pct}%.`);
              }}
              onRemove={(id) => changeValues(() => useApp.getState().toggleValue(id), "Removed")}
            />
          </motion.div>
        )}

        <motion.div layout className="mt-10">
          <h2 className="caps mb-3 text-label text-ink-2">{generic ? "Pick any" : "Add more"}</h2>
          <div className="flex flex-col gap-3">
            {unselectedCatalog.map((c) => {
              const Icon = VALUE_ICONS[c.icon];
              return (
                <SelectionRow key={c.id} layout icon={<Icon size={24} />} label={c.rowLabel} selected={false} onToggle={() => toggle(c.id)} />
              );
            })}
            {unselectedCustoms.map((c) => (
              <SelectionRow
                key={c.id}
                layout
                icon={<Sparkle size={22} />}
                label={c.label}
                caption="In your words."
                selected={false}
                onToggle={() => toggle(c.id)}
              />
            ))}
            <SelectionRow layout dashed icon={<Plus size={22} />} label="Add your own" onToggle={() => openSheet({ type: "add" })} />
          </div>
        </motion.div>
      </LayoutGroup>
    </Screen>
  );
}
