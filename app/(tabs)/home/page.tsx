"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Screen } from "@/components/Screen";
import { Card, CardHeader, Delta, NewPill, Sparkline, StackedBar } from "@/components/ui/Card";
import { CountUp, money0 } from "@/components/ui/CountUp";
import { Gear } from "@/components/ui/icons";
import { september, DEMO_TODAY_LABEL } from "@/data/demo";
import { dailyCumulative } from "@/data/transactions";
import { useApp, useUI } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";

const SPARK = dailyCumulative();

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
  const name = useApp((s) => s.name);
  const goal = useApp((s) => s.goal);
  const lastSeen = useApp((s) => s.lastSeenPct);
  const baseline = useApp((s) => s.changeBaselinePct);
  const set = useApp((s) => s.set);
  const openSheet = useUI((s) => s.openSheet);

  const pct = d.summary.alignmentPct;
  // Count up from the % the user last saw (0 on first visit).
  const [from] = useState(() => lastSeen ?? 0);
  useEffect(() => {
    if (pct !== null) set({ lastSeenPct: pct });
  }, [pct, set]);

  const total = d.summary.total;
  const spendDelta = Math.round(september.totalSpend - total);
  const sinceChange = baseline !== null && pct !== null && baseline !== pct;
  const pctDelta = sinceChange ? pct! - baseline! : pct !== null ? pct - september.alignmentPct : 0;
  const goalSpend = goal ? goal.merchantIds.reduce((s, id) => s + (d.spend[id] ?? 0), 0) : 0;

  return (
    <Screen tabs>
      <div className="flex h-11 items-center justify-between">
        <motion.button
          type="button"
          aria-label="Settings"
          whileTap={{ scale: 0.92 }}
          onClick={() => openSheet({ type: "settings" })}
          className="-ml-2.5 flex h-11 w-11 items-center justify-center"
        >
          <Gear size={22} />
        </motion.button>
        <p className="caps text-label text-black">{DEMO_TODAY_LABEL}</p>
        <span className="w-11" />
      </div>

      <h1 className="head mt-4 text-h2 text-black">Hi, {name || "there"}</h1>

      <motion.div variants={stagger} initial="hidden" animate="show" className="mt-6 flex flex-col gap-3">
        <motion.div variants={item}>
          <Card
            onClick={() => {
              useUI.setState({ spendingFilter: "all" });
              router.push("/spending");
            }}
            ariaLabel="Spent this month. Open spending."
          >
            <CardHeader label="Spent this month" />
            <p className="num mt-3 text-cardnum text-black">
              <CountUp to={total} format={money0} />
            </p>
            <Delta direction={spendDelta >= 0 ? "down" : "up"} value={money0(Math.abs(spendDelta))} caption="vs. Sept" />
            <Sparkline values={SPARK} />
          </Card>
        </motion.div>

        <motion.div variants={item}>
          {d.generic ? (
            <Card ariaLabel="Rated coverage">
              <CardHeader label="Rated spending" chevron={false} />
              <p className="num mt-3 text-hero text-black">
                <CountUp to={d.coverage.coveragePct} format={(n) => `${Math.round(n)}%`} />
              </p>
              <p className="mt-2 font-serif text-caption text-ink-2">
                {d.coverage.coveragePct}% of your spending matched to rated companies.
              </p>
              <button
                type="button"
                onClick={() => router.push("/you")}
                className="mt-3 min-h-11 font-serif text-body text-royal underline underline-offset-4"
              >
                Set your values
              </button>
            </Card>
          ) : (
            <Card
              onClick={() => {
                useUI.setState({ spendingFilter: "flagged" });
                router.push("/spending?filter=flagged");
              }}
              ariaLabel="Matches your values. Open flagged merchants."
              footer={
                <>
                  <span className="caps text-label text-black">{money0(d.summary.unknown)} unknown</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openSheet({ type: "howcalc" });
                    }}
                    className="min-h-11 font-serif text-caption italic text-ink-2 underline underline-offset-4"
                  >
                    How we calculate
                  </button>
                </>
              }
            >
              <CardHeader label="Matches your values" />
              {pct === null ? (
                <>
                  <p className="head mt-3 text-h2 text-black">Not enough data yet</p>
                  <p className="mt-2 font-serif text-caption text-ink-2">
                    Less than 20% of your spending has ratings for the values you marked important.
                  </p>
                </>
              ) : (
                <>
                  <p className="num mt-3 text-hero text-black">
                    <CountUp key={`${from}-${pct}`} from={from} to={pct} format={(n) => `${Math.round(n)}%`} delay={0.2} />
                  </p>
                  <p className="mt-2 font-serif text-caption text-ink-2">of your rated spending</p>
                  <Delta
                    direction={pctDelta >= 0 ? "up" : "down"}
                    value={`${Math.abs(pctDelta)} pts`}
                    caption={sinceChange ? "since you changed your values" : "vs. Sept"}
                  />
                  <StackedBar aligned={d.summary.aligned} mixed={d.summary.mixed} conflicts={d.summary.conflicts} />
                </>
              )}
            </Card>
          )}
        </motion.div>

        {!d.generic && (
          <motion.div variants={item}>
            <Card onClick={() => router.push("/report")} ariaLabel="October report">
              <CardHeader label="October report" extra={<NewPill />} />
              <p className="mt-3 font-serif text-body text-black">
                {d.flagIds.length} {d.flagIds.length === 1 ? "merchant" : "merchants"} flagged. See where →
              </p>
            </Card>
          </motion.div>
        )}

        {goal && (
          <motion.div variants={item} layout>
            <Card
              ariaLabel={`Goal: ${goal.label}`}
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

      <p className="mt-8 text-center font-serif text-caption text-ink-2">Ratings are illustrative demo data.</p>
    </Screen>
  );
}
