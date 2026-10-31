"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { Screen } from "@/components/Screen";
import { Card, CardHeader } from "@/components/ui/Card";
import { CountUp, money0 } from "@/components/ui/CountUp";
import { PlanCard } from "@/components/ui/PlanCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useApp } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";

const COLORS = ["#1D3BC4", "#2D6FD6", "#7C8CE8", "#F2C12E", "#E05A2B", "#9A978F", "#CFCBC3"];
const BUDGETS = [1800, 2000, 2200, 2500] as const;

function Donut({ parts }: { parts: { name: string; value: number }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const r = 70;
  const c = 2 * Math.PI * r;
  const offsets = parts.map((_, i) => parts.slice(0, i).reduce((s, p) => s + (p.value / total) * c, 0));
  return (
    <svg viewBox="0 0 200 200" width="100%" className="mx-auto block max-w-[220px]" role="img" aria-label="Spending by category">
      <g transform="rotate(-90 100 100)">
        <circle cx="100" cy="100" r={r} fill="none" stroke="#EDEBE7" strokeWidth={30} />
        {parts.map((p, i) => {
          const len = (p.value / total) * c;
          return (
            <motion.circle
              key={p.name}
              cx="100"
              cy="100"
              r={r}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={30}
              strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
              strokeDashoffset={-offsets[i]}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 * i, duration: 0.4 }}
            />
          );
        })}
      </g>
    </svg>
  );
}

export default function BudgetPage() {
  const d = useDerived();
  const budget = useApp((s) => s.budget);
  const set = useApp((s) => s.set);

  const parts = useMemo(() => {
    const by: Record<string, number> = {};
    for (const r of d.rows) by[r.merchant.category] = (by[r.merchant.category] ?? 0) + r.spend;
    const sorted = Object.entries(by).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 6);
    const rest = sorted.slice(6).reduce((s, x) => s + x.value, 0);
    return rest > 0 ? [...top, { name: "Everything else", value: rest }] : top;
  }, [d.rows]);

  const total = d.summary.total;
  const left = budget - total;

  return (
    <Screen tabs>
      <h1 className="head mt-2 text-h2 text-black">Budget</h1>
      <div className="mt-5 flex flex-col gap-3">
        <Card>
          <CardHeader label="Monthly budget" chevron={false} />
          <p className="num mt-3 text-hero text-black">
            <CountUp to={Math.abs(left)} format={money0} />
          </p>
          <p className="font-serif text-body text-ink-2">{left >= 0 ? "left this month" : "over this month"}</p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-fill" aria-hidden>
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: left >= 0 ? "#1D3BC4" : "#E05A2B" }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (total / budget) * 100)}%` }}
              transition={{ type: "spring", stiffness: 160, damping: 26 }}
            />
          </div>
          <p className="mt-2 font-serif text-caption text-ink-2">
            {money0(total)} spent of {money0(budget)}
          </p>
          <div className="mt-4">
            <SegmentedControl
              ariaLabel="Monthly budget"
              options={BUDGETS.map((b) => ({ value: b, label: `$${(b / 1000).toFixed(1)}K` }))}
              value={BUDGETS.includes(budget as (typeof BUDGETS)[number]) ? budget : 2200}
              onChange={(v) => set({ budget: v })}
            />
          </div>
        </Card>

        <Card>
          <CardHeader label="Where it went" chevron={false} />
          <div className="mt-4">
            <Donut parts={parts} />
          </div>
          <ul className="mt-4">
            {parts.map((p, i) => (
              <li key={p.name} className="flex min-h-11 items-center gap-3 border-t border-hairline">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} aria-hidden />
                <span className="flex-1 font-serif text-body text-black">{p.name}</span>
                <span className="num text-label text-black">{money0(p.value)}</span>
              </li>
            ))}
          </ul>
        </Card>

        {!d.generic && d.flagIds.length > 0 && <PlanCard profile={d.profile} />}
      </div>
    </Screen>
  );
}
