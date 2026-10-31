"use client";

import { LayoutGroup, motion } from "motion/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackButton, PrimaryButton } from "@/components/ui/Buttons";
import { Check, Plus, Sparkle } from "@/components/ui/icons";
import { useApp, useUI } from "@/lib/store";
import { CATALOG } from "@/lib/values";

function Chip({
  label,
  selected,
  ai = false,
  onClick,
}: {
  label: string;
  selected: boolean;
  ai?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      layout
      type="button"
      role="checkbox"
      aria-checked={selected}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 34 }}
      onClick={onClick}
      className={`caps inline-flex min-h-10 items-center gap-1.5 rounded-pill border-2 px-3.5 text-seg ${
        selected ? "border-royal bg-royal text-white" : "border-hairline bg-white text-black"
      }`}
    >
      {selected && <Check size={16} strokeWidth={2.6} />}
      {!selected && ai && <Sparkle size={14} strokeWidth={2.2} className="text-royal" />}
      {label}
    </motion.button>
  );
}

export default function ValuesPage() {
  const router = useRouter();
  const selectedIds = useApp((s) => s.selectedIds);
  const customs = useApp((s) => s.customs);
  const toggle = useApp((s) => s.toggleValue);
  const set = useApp((s) => s.set);
  const openSheet = useUI((s) => s.openSheet);
  const [sensitive, setSensitive] = useState(false);
  const main = CATALOG.filter((c) => !c.sensitive);
  const topics = CATALOG.filter((c) => c.sensitive);

  return (
    <Screen
      className="flex flex-col"
      footer={
        <div className="flex flex-col items-center gap-2">
          <PrimaryButton
            disabled={selectedIds.length === 0}
            onClick={() => {
              set({ mode: "values" });
              router.push("/link");
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
      <h1 className="head mt-3 text-h1 text-black">
        What do you <span className="text-royal">care</span> about?
      </h1>
      <p className="mt-3 font-serif text-body text-ink-2">Start with a few. You can fine-tune how much each matters later.</p>

      <LayoutGroup>
        <motion.div layout className="flex flex-1 flex-wrap content-center justify-center gap-2 py-5">
          {main.map((c) => (
            <Chip key={c.id} label={c.rowLabel} ai={Boolean(c.topic)} selected={selectedIds.includes(c.id)} onClick={() => (c.topic ? openSheet({ type: "add", text: c.topic }) : toggle(c.id))} />
          ))}
          {sensitive &&
            topics.map((c) => (
              <Chip key={c.id} label={c.rowLabel} ai selected={selectedIds.includes(c.id)} onClick={() => openSheet({ type: "add", text: c.topic })} />
            ))}
          {customs.map((c) => (
            <Chip key={c.id} label={c.label} selected={selectedIds.includes(c.id)} onClick={() => toggle(c.id)} />
          ))}
        </motion.div>

        <motion.button
          layout
          type="button"
          aria-expanded={sensitive}
          onClick={() => setSensitive((v) => !v)}
          className="mb-3 min-h-11 self-center font-serif text-caption italic text-ink-2 underline underline-offset-4"
        >
          {sensitive ? "Hide sensitive topics" : "Sensitive topics (optional)"}
        </motion.button>
        {sensitive && (
          <p className="mb-3 text-center font-serif text-micro text-ink-2">
            Tally doesn&apos;t take a side or guess your beliefs. It asks what you want to look at, and only uses data it has.
          </p>
        )}

        <motion.button
          layout
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => openSheet({ type: "add" })}
          className="mb-1 flex min-h-[112px] w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-royal bg-royal-tint px-6 text-center"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-royal text-white">
            <Plus size={26} strokeWidth={2.4} />
          </span>
          <span className="caps text-label text-royal">Add your own</span>
          <span className="font-serif text-caption text-ink-2">Say it in your own words. Tally&apos;s AI will map it.</span>
        </motion.button>
      </LayoutGroup>
    </Screen>
  );
}
