"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Screen } from "@/components/Screen";
import { Card, CardHeader, Delta } from "@/components/ui/Card";
import { CountUp, money0 } from "@/components/ui/CountUp";
import { Bell, ChevronRight, Gear, Leaf } from "@/components/ui/icons";
import { InsightTabs } from "@/components/home/InsightTabs";
import { SpendChart } from "@/components/ui/SpendChart";
import { september, DEMO_TODAY_LABEL } from "@/data/demo";
import { dailyCumulativeCo2e, priorMonthCurve, totalCo2e } from "@/data/emissions";
import { dailyCumulative } from "@/data/transactions";
import { karmaCredits } from "@/lib/engine";
import { useApp, useUI, type Snapshot } from "@/lib/store";
import type { Label } from "@/lib/types";
import { useDerived } from "@/lib/useDerived";

const SPEND_SERIES = dailyCumulative();
const CO2_SERIES = dailyCumulativeCo2e();
const SPEND_PRIOR = priorMonthCurve(september.totalSpend);
const CO2_PRIOR = priorMonthCurve(Math.round(totalCo2e() * 1.12));

type Metric = "usd" | "co2";
const kg = (n: number) => `${Math.round(n).toLocaleString()} kg`;

function MetricSwitch({ value, onChange }: { value: Metric; onChange: (m: Metric) => void }) {
  return (
    <div role="radiogroup" aria-label="Spend metric" className="flex h-9 rounded-pill bg-fill p-0.5">
      {(["usd", "co2"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={value === m}
          onClick={(e) => {
            e.stopPropagation();
            onChange(m);
          }}
          className={`caps min-h-8 min-w-[52px] rounded-pill px-3 text-seg ${value === m ? "bg-white text-black shadow-[0_1px_3px_rgba(0,0,0,0.1)]" : "text-ink-2"}`}
        >
          {m === "usd" ? "$" : "CO\u2082e"}
        </button>
      ))}
    </div>
  );
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 34 } },
};

export default function HomePage() {
  const router = useRouter();
  const d = useDerived();
  const goal = useApp((s) => s.goal);
  const targets = useApp((s) => s.targets);
  const reviewList = useApp((s) => s.reviewList);
  const consideration = useApp((s) => s.consideration);
  const planCount = Object.keys(targets).length + reviewList.length + consideration.length;
  const set = useApp((s) => s.set);
  const openSheet = useUI((s) => s.openSheet);

  const pct = d.summary.alignmentPct;
  const visible = Object.entries(d.summary.labels).filter(([id]) => !d.kept.includes(id));
  const count = (l: Label) => visible.filter(([, x]) => x === l).length;
  const now: Snapshot = { pct, conflicts: count("Conflicts"), flagged: d.flagIds.length };

  // Remember what the person last saw, for the demo's "since you changed your values" flow.
  useEffect(() => {
    set({ lastSeen: now });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now.pct, now.conflicts, now.flagged, set]);

  const total = d.summary.total;
  const karma = karmaCredits(d.summary);
  const [metric, setMetric] = useState<Metric>("usd");
  const co2 = totalCo2e();
  const spendDelta = Math.round(september.totalSpend - total);
  const goalSpend = goal ? goal.merchantIds.reduce((s, id) => s + (d.spend[id] ?? 0), 0) : 0;

  return (
    <Screen tabs>
      <div className="flex h-11 items-center justify-between">
        <div className="-ml-2.5 flex items-center">
          <motion.button
            type="button"
            aria-label="Settings"
            whileTap={{ scale: 0.92 }}
            onClick={() => openSheet({ type: "settings" })}
            className="flex h-11 w-11 items-center justify-center"
          >
            <Gear size={22} />
          </motion.button>
          <motion.button
            type="button"
            aria-label="Notifications"
            whileTap={{ scale: 0.92 }}
            onClick={() => openSheet({ type: "notifications" })}
            className="relative flex h-11 w-11 items-center justify-center"
          >
            <Bell size={22} />
            <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-cream bg-royal" aria-hidden />
          </motion.button>
        </div>
        <p className="caps text-label text-black">{DEMO_TODAY_LABEL}</p>
        <motion.button
          type="button"
          aria-label={`${karma.toLocaleString()} karma credits`}
          whileTap={{ scale: 0.95 }}
          onClick={() => openSheet({ type: "karma" })}
          className="flex h-10 items-center gap-1.5 rounded-pill bg-royal-tint pl-3 pr-2 text-royal"
        >
          <Leaf size={17} strokeWidth={2.2} />
          <span className="num text-label">{karma.toLocaleString()}</span>
          <ChevronRight size={16} strokeWidth={2.4} />
        </motion.button>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="mt-5 flex flex-col gap-3">
        <motion.div variants={item}>
          <Card>
            <div className="flex items-center justify-between gap-3">
              <p className="caps whitespace-nowrap text-seg text-ink-2">Spend this month</p>
              <MetricSwitch value={metric} onChange={setMetric} />
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="num text-hero text-black">
                {metric === "usd" ? <CountUp key="usd" to={total} format={money0} /> : <CountUp key="co2" to={co2} format={kg} />}
              </p>
              <button
                type="button"
                onClick={() => {
                  useUI.setState({ spendingFilter: "all" });
                  router.push(metric === "usd" ? "/spending" : "/transactions");
                }}
                className="mb-2 min-h-11 whitespace-nowrap font-serif text-caption italic text-royal underline underline-offset-4"
              >
                {metric === "usd" ? "Details" : "Purchases"}
              </button>
            </div>
            {metric === "usd" ? (
              <Delta direction={spendDelta >= 0 ? "down" : "up"} value={money0(Math.abs(spendDelta))} caption="vs. Sept" />
            ) : (
              <Delta direction={co2 <= Math.round(co2 * 1.12) ? "down" : "up"} value={kg(Math.round(co2 * 1.12) - co2)} caption="vs. Sept" />
            )}
            <SpendChart
              key={metric}
              values={metric === "usd" ? SPEND_SERIES : CO2_SERIES}
              prior={metric === "usd" ? SPEND_PRIOR : CO2_PRIOR}
              format={metric === "usd" ? money0 : kg}
            />
            {metric === "co2" && (
              <p className="mt-2 font-serif text-micro text-ink-2">Estimated from what you spent, using illustrative factors. Not a measured footprint.</p>
            )}
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <InsightTabs />
        </motion.div>

        {planCount > 0 && (
          <motion.div variants={item}>
            <Card onClick={() => router.push("/tally")}>
              <CardHeader label="Your Tally plans" />
              <p className="num mt-3 text-cardnum text-black">{money0(Object.values(targets).reduce((s, t) => s + t.savings, 0))}<span className="font-serif text-body text-ink-2"> a month planned</span></p>
              <p className="mt-1 font-serif text-caption text-ink-2">
                {Object.keys(targets).length} {Object.keys(targets).length === 1 ? "target" : "targets"}, {reviewList.length} to review, {consideration.length} being considered
              </p>
            </Card>
          </motion.div>
        )}

        {goal && (
          <motion.div variants={item} layout>
            <Card
              tone="sky"
              footer={
                <>
                  <span className="caps text-label text-black">Goal: under {money0(goal.target)}</span>
                  <span className="font-serif text-caption italic text-ink-2">Starts tracking in November</span>
                </>
              }
            >
              <CardHeader label={goal.label} chevron={false} />
              <p className="num mt-3 text-cardnum text-black">
                <CountUp to={goalSpend} format={money0} />
              </p>
              <p className="mt-1 font-serif text-caption text-ink-2">this month</p>
            </Card>
          </motion.div>
        )}
      </motion.div>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={() => router.push("/you")}
          className="min-h-11 font-serif text-body text-royal underline underline-offset-4"
        >
          Edit your values
        </button>
      </div>
      <p className="mt-2 text-center font-serif text-caption text-ink-2">
        We do the research. You keep the judgment. Ratings are illustrative demo data.
      </p>
    </Screen>
  );
}
