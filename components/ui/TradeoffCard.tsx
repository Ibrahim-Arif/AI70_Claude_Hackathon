"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { SecondaryButton } from "./Buttons";
import { SegmentedControl } from "./SegmentedControl";
import { Shimmer } from "./AISummary";
import { Monogram } from "./MerchantRow";
import { StatusMarker } from "./Status";
import { Sparkle } from "./icons";
import { money } from "@/lib/ai/tradeoff";
import { getTradeoff, type TradeoffResult } from "@/lib/ai/client";
import { merchantById } from "@/data/merchants";
import { useApp } from "@/lib/store";
import type { Profile } from "@/lib/types";

type Priority = "cost" | "evidence" | "balance";

/** The person picks the priority; we only reorder. Nothing is ranked on their behalf. */
function order(scenarios: TradeoffResult["scenarios"], p: Priority) {
  const list = [...scenarios];
  if (p === "cost") return list.sort((a, b) => a.monthlyCostDelta - b.monthlyCostDelta);
  if (p === "evidence") return list.sort((a, b) => b.improvesOn.length - a.improvesOn.length);
  return list;
}

/** Neutral tradeoff: costs from the engine, narration from AI, no recommendation. */
export function TradeoffCard({ merchantId, monthlySpend, profile, autoRun = false }: { merchantId: string; monthlySpend: number; profile: Profile; autoRun?: boolean }) {
  const aiMode = useApp((s) => s.aiMode);
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [t, setT] = useState<TradeoffResult | null>(null);
  const [priority, setPriority] = useState<Priority>("balance");

  const run = async () => {
    setState("loading");
    setT(await getTradeoff(merchantById[merchantId], monthlySpend, profile, aiMode));
    setState("done");
  };

  useEffect(() => {
    if (!autoRun) return;
    const t = setTimeout(() => void run(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "idle") return <SecondaryButton onClick={run}>Is there an alternative that fits me without costing much more?</SecondaryButton>;
  if (state === "loading") {
    return (
      <section className="rounded-row bg-royal-tint px-4 py-4">
        <Shimmer lines={3} label="Working through the numbers" />
      </section>
    );
  }
  if (!t) return <p className="font-serif text-caption text-ink-2">We couldn&apos;t load this right now. Keeping things as they are is always an option.</p>;

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className="rounded-row bg-royal-tint px-4 py-4">
      <p className="caps mb-2 flex items-center gap-1.5 text-micro text-ink-2">
        <Sparkle size={14} strokeWidth={2.2} className="text-royal" />
        The tradeoff
      </p>
      {t.scenarios.length > 1 && (
        <div className="mb-3">
          <p className="mb-2 font-serif text-caption text-ink-2">What would you like to prioritize?</p>
          <SegmentedControl<Priority>
            ariaLabel="Tradeoff priority"
            options={[
              { value: "cost", label: "Low cost" },
              { value: "balance", label: "Balance" },
              { value: "evidence", label: "Evidence" },
            ]}
            value={priority}
            onChange={setPriority}
          />
        </div>
      )}
      {t.scenarios.length > 0 && (
        <ul className="mb-3 flex flex-col gap-2">
          {order(t.scenarios, priority).map((s) => (
            <li key={s.alternative.name} className="flex items-center gap-3 rounded-row bg-white px-3.5 py-3">
              <Monogram name={s.alternative.name} label={s.label} />
              <div className="min-w-0 flex-1">
                <p className="caps truncate text-label text-black">{s.alternative.name}</p>
                <p className="font-serif text-caption text-ink-2">
                  {s.monthlyCostDelta === 0 ? "Same cost" : `${s.monthlyCostDelta > 0 ? "+" : "−"}${money(s.monthlyCostDelta)} a month`}
                  {s.withinBudget ? "" : ", above your budget"}
                </p>
                {s.improvesOn.length > 0 && <p className="font-serif text-micro text-ink-2">Meets {s.improvesOn.join(", ")}</p>}
              </div>
              <StatusMarker label={s.label} />
            </li>
          ))}
        </ul>
      )}
      <p className="font-serif text-summary italic text-ink-2">{t.narrative}</p>
      <ul className="mt-3 list-disc pl-5 font-serif text-caption text-black">
        {t.questions.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ul>
      <p className="mt-3 font-serif text-micro text-ink-2">Costs are estimates from the ratings and prices in this demo. Keeping this purchase is always a valid choice.</p>
    </motion.section>
  );
}
