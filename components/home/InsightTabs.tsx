"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PrimaryButton } from "../ui/Buttons";
import { Card } from "../ui/Card";
import { money0 } from "../ui/CountUp";
import { ArrowRight, ChevronRight, Doc, Eye, PieChart } from "../ui/icons";
import { Monogram } from "../ui/MerchantRow";
import { PlanCard } from "../ui/PlanCard";
import { StatusShape } from "../ui/Status";
import { merchantById } from "@/data/merchants";
import { topFindings } from "@/lib/insights";
import { useUI } from "@/lib/store";
import type { Label } from "@/lib/types";
import { useDerived } from "@/lib/useDerived";

type Tab = "look" | "spend" | "next" | "report";

const TABS: { id: Tab; label: string; title: string; Icon: typeof Eye }[] = [
  { id: "spend", label: "Spend", title: "Where you spend", Icon: PieChart },
  { id: "look", label: "Look", title: "Closer look", Icon: Eye },
  { id: "report", label: "Report", title: "October report", Icon: Doc },
  { id: "next", label: "Next", title: "Your next step", Icon: ArrowRight },
];

const WORD: Record<Label, string> = { Aligned: "match", Mixed: "mixed", Conflicts: "conflict", Unknown: "no rating" };

/** One card, four tabs. Everything about "what should I know" without scrolling past four cards. */
export function InsightTabs() {
  const router = useRouter();
  const d = useDerived();
  const openSheet = useUI((s) => s.openSheet);
  const [tab, setTab] = useState<Tab>("spend");

  if (d.generic) {
    return (
      <Card>
        <p className="num text-cardnum text-black">{d.coverage.coveragePct}%</p>
        <p className="mt-1 font-serif text-body text-ink-2">of your spending has ratings</p>
        <PrimaryButton className="mt-4 h-12" onClick={() => router.push("/you")}>Set your values</PrimaryButton>
      </Card>
    );
  }

  const findings = topFindings(d.rows, d.kept);
  const visible = Object.entries(d.summary.labels).filter(([id]) => !d.kept.includes(id));
  const count = (l: Label) => visible.filter(([, x]) => x === l).length;
  const s = d.summary;
  const pct = s.alignmentPct;
  const flagged = d.flagIds.length;

  const go = (filter: string) => {
    useUI.setState({ spendingFilter: filter === "flagged" ? "flagged" : filter === "unknown" ? "unknown" : "all" });
    router.push(filter === "all" ? "/spending" : `/spending?filter=${filter}`);
  };

  const tiles: { label: Label; amount: number; filter: string }[] = [
    { label: "Aligned", amount: s.aligned, filter: "all" },
    { label: "Mixed", amount: s.mixed, filter: "flagged" },
    { label: "Conflicts", amount: s.conflicts, filter: "flagged" },
    { label: "Unknown", amount: s.unknown, filter: "unknown" },
  ];

  return (
    <Card>
      <div role="tablist" aria-label="Insights" className="grid grid-cols-4 gap-2">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          const badge = id === "look" ? findings.length : id === "report" ? flagged : 0;
          return (
            <motion.button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              whileTap={{ scale: 0.94 }}
              onClick={() => setTab(id)}
              className={`relative flex h-[66px] flex-col items-center justify-center gap-1 rounded-row border-2 ${active ? "border-royal bg-royal text-white" : "border-hairline bg-white text-black"}`}
            >
              <Icon size={24} strokeWidth={2} />
              <span className="caps text-[10px] tracking-[0.03em]">{label}</span>
              {badge > 0 && (
                <span className={`num absolute -right-1 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] ${active ? "bg-white text-royal" : "bg-royal text-white"}`}>
                  {badge}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      <p className="caps mt-5 text-label text-ink-2">{TABS.find((t) => t.id === tab)!.title}</p>

      <div className="mt-2 min-h-[212px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.16 }}>
            {tab === "look" && (
              <ul>
                {findings.length === 0 && <li className="py-6 font-serif text-body text-ink-2">Nothing stands out right now.</li>}
                {findings.map((f) => (
                  <li key={f.merchantId} className="border-t border-hairline first:border-t-0">
                    <button type="button" onClick={() => openSheet({ type: "merchant", id: f.merchantId })} className="flex min-h-[68px] w-full items-center gap-3 py-2.5 text-left">
                      <Monogram name={merchantById[f.merchantId].name} label={f.label} />
                      <span className="min-w-0 flex-1">
                        <span className="caps block truncate text-label text-black">{merchantById[f.merchantId].name}</span>
                        <span className="block truncate font-serif text-caption text-ink-2">{f.short}</span>
                      </span>
                      <ChevronRight size={20} className="shrink-0 text-royal" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {tab === "spend" && (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="num text-hero text-black">{pct === null ? "–" : `${pct}%`}</span>
                  <span className="font-serif text-body text-ink-2">match</span>
                </div>
                <div className="mt-3 flex h-2.5 w-full gap-[3px] overflow-hidden rounded-full" aria-hidden>
                  {tiles.map((t) => (
                    <div key={t.label} className="h-full rounded-full" style={{ width: `${Math.max(2, (t.amount / (s.total || 1)) * 100)}%`, backgroundColor: { Aligned: "#1D3BC4", Mixed: "#F2C12E", Conflicts: "#E05A2B", Unknown: "#CFCBC3" }[t.label] }} />
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {tiles.map((t) => (
                    <button key={t.label} type="button" onClick={() => go(t.filter)} className="flex min-h-14 items-center gap-2.5 rounded-row bg-fill px-3 text-left">
                      <StatusShape label={t.label} />
                      <span>
                        <span className="num block text-label text-black">{money0(t.amount)}</span>
                        <span className="block font-serif text-micro text-ink-2">{WORD[t.label]}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === "next" && <PlanCard profile={d.profile} compact />}

            {tab === "report" && (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="num text-hero text-black">{flagged}</span>
                  <span className="font-serif text-body text-ink-2">to look at</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["Conflicts", "Mixed", "Unknown"] as Label[]).map((l) => (
                    <span key={l} className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-fill px-3">
                      <StatusShape label={l} />
                      <span className="num text-label text-black">{count(l)}</span>
                      <span className="font-serif text-micro text-ink-2">{WORD[l]}</span>
                    </span>
                  ))}
                </div>
                <PrimaryButton className="mt-5 h-12" onClick={() => router.push("/report")}>Open report</PrimaryButton>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Card>
  );
}
