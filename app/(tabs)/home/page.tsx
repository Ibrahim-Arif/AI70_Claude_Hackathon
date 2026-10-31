"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Screen } from "@/components/Screen";
import { Card, CardHeader, Delta, NewPill, StackedBar } from "@/components/ui/Card";
import { CountUp, money0 } from "@/components/ui/CountUp";
import { Bell, ChevronRight, Gear, Leaf } from "@/components/ui/icons";
import { PlanCard } from "@/components/ui/PlanCard";
import { Monogram } from "@/components/ui/MerchantRow";
import { topFindings } from "@/lib/insights";
import { SpendChart } from "@/components/ui/SpendChart";
import { StatusShape } from "@/components/ui/Status";
import { september, DEMO_TODAY_LABEL } from "@/data/demo";
import { dailyCumulativeCo2e, priorMonthCurve, totalCo2e } from "@/data/emissions";
import { merchantById } from "@/data/merchants";
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

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const CHIP_WORD: Record<Label, string> = { Aligned: "aligned", Mixed: "mixed", Conflicts: "conflicts", Unknown: "no rating" };

function Chip({ label, count }: { label: Label; count: number }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-white px-3">
      <StatusShape label={label} />
      <span className="font-serif text-status text-ink-2">
        {count} {CHIP_WORD[label]}
      </span>
    </span>
  );
}

export default function HomePage() {
  const router = useRouter();
  const d = useDerived();
  const goal = useApp((s) => s.goal);
  const lastSeen = useApp((s) => s.lastSeen);
  const baseline = useApp((s) => s.changeBaseline);
  const set = useApp((s) => s.set);
  const openSheet = useUI((s) => s.openSheet);

  const pct = d.summary.alignmentPct;
  const visible = Object.entries(d.summary.labels).filter(([id]) => !d.kept.includes(id));
  const count = (l: Label) => visible.filter(([, x]) => x === l).length;
  const now: Snapshot = { pct, conflicts: count("Conflicts"), flagged: d.flagIds.length };

  // Count up from what the user last saw on Home (0 on first visit).
  const [from] = useState<Snapshot>(() => lastSeen ?? { pct: 0, conflicts: 0, flagged: 0 });
  useEffect(() => {
    set({ lastSeen: now });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now.pct, now.conflicts, now.flagged, set]);

  const total = d.summary.total;
  const karma = karmaCredits(d.summary);
  const findings = topFindings(d.rows, d.kept);
  const [metric, setMetric] = useState<Metric>("usd");
  const co2 = totalCo2e();
  const spendDelta = Math.round(september.totalSpend - total);
  const conflictDelta = baseline ? now.conflicts - baseline.conflicts : 0;
  const pctDelta = baseline && baseline.pct !== null && pct !== null ? pct - baseline.pct : 0;
  const sinceChange = baseline !== null && (conflictDelta !== 0 || pctDelta !== 0);
  const goalSpend = goal ? goal.merchantIds.reduce((s, id) => s + (d.spend[id] ?? 0), 0) : 0;

  let delta: { direction: "up" | "down"; value: string; caption: string; tone: "good" | "bad" } | null = null;
  if (sinceChange && conflictDelta !== 0) {
    delta = {
      direction: conflictDelta > 0 ? "up" : "down",
      value: plural(Math.abs(conflictDelta), "conflict"),
      caption: "since you changed your values",
      tone: conflictDelta > 0 ? "bad" : "good",
    };
  } else if (sinceChange) {
    delta = {
      direction: pctDelta >= 0 ? "up" : "down",
      value: `${Math.abs(pctDelta)} pts`,
      caption: "since you changed your values",
      tone: pctDelta >= 0 ? "good" : "bad",
    };
  } else if (pct !== null) {
    const v = pct - september.alignmentPct;
    delta = { direction: v >= 0 ? "up" : "down", value: `${Math.abs(v)} pts`, caption: "vs. Sept", tone: v >= 0 ? "good" : "bad" };
  }

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

        {!d.generic && findings.length > 0 && (
          <motion.div variants={item}>
            <Card>
              <CardHeader label="What deserves a closer look" chevron={false} extra={<span className="font-serif text-caption text-ink-2">{findings.length} {findings.length === 1 ? "finding" : "findings"}</span>} />
              <ul className="mt-2">
                {findings.map((f) => (
                  <li key={f.merchantId} className="border-t border-hairline first:border-t-0">
                    <button
                      type="button"
                      onClick={() => openSheet({ type: "merchant", id: f.merchantId })}
                      className="flex min-h-[72px] w-full items-center gap-3 py-3 text-left"
                    >
                      <Monogram name={merchantById[f.merchantId].name} label={f.label} />
                      <span className="min-w-0 flex-1">
                        <span className="caps block truncate text-label text-black">{merchantById[f.merchantId].name}</span>
                        <span className="block font-serif text-caption text-black">{f.headline}</span>
                        {f.detail && <span className="block font-serif text-micro text-ink-2">{f.detail}</span>}
                      </span>
                      <ChevronRight size={18} className="shrink-0 text-ink-2" />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-1 font-serif text-micro text-ink-2">These are starting points, not verdicts. Tap one to see the evidence and your options.</p>
            </Card>
          </motion.div>
        )}

        <motion.div variants={item}>
          {d.generic ? (
            <Card tone="royal">
              <CardHeader label="Rated spending" chevron={false} onDark />
              <p className="num mt-3 text-hero text-white">
                <CountUp to={d.coverage.coveragePct} format={(n) => `${Math.round(n)}%`} />
              </p>
              <p className="mt-2 font-serif text-caption text-white">
                {d.coverage.coveragePct}% of your spending matched to rated companies.
              </p>
              <button
                type="button"
                onClick={() => router.push("/you")}
                className="mt-4 h-11 rounded-pill bg-white px-5 font-display text-label uppercase tracking-[0.05em] text-royal"
              >
                Set your values
              </button>
            </Card>
          ) : (
            <Card
              tone="royal"
              onClick={() => {
                useUI.setState({ spendingFilter: "flagged" });
                router.push("/spending?filter=flagged");
              }}
              footer={
                <>
                  <span className="font-serif text-caption text-white">Adds up to {money0(d.summary.total)}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openSheet({ type: "howcalc" });
                    }}
                    className="min-h-11 font-serif text-caption italic text-white underline underline-offset-4"
                  >
                    How we calculate
                  </button>
                </>
              }
            >
              <CardHeader label="Where your spending sits" onDark />
              {pct === null ? (
                <>
                  <p className="head mt-3 text-h2 text-white">Not enough data yet</p>
                  <p className="mt-2 font-serif text-caption text-white">
                    Less than 20% of your spending has ratings for the values you marked important.
                  </p>
                </>
              ) : (
                <>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="num text-cardnum text-white">
                      <CountUp key={`${from.pct}-${pct}`} from={from.pct ?? 0} to={pct} format={(n) => `${Math.round(n)}%`} delay={0.2} />
                    </p>
                    <p className="mb-1 flex items-center gap-2 rounded-pill bg-white px-3 py-1.5">
                      <StatusShape label="Conflicts" />
                      <span className="num text-label text-black">
                        <CountUp key={`c-${from.conflicts}-${now.conflicts}`} from={from.conflicts} to={now.conflicts} delay={0.3} />
                      </span>
                      <span className="font-serif text-status text-ink-2">{now.conflicts === 1 ? "conflict" : "conflicts"}</span>
                    </p>
                  </div>
                  <p className="mt-2 font-serif text-caption text-white">of your rated spending lines up with what you chose</p>
                  {delta && <Delta {...delta} onDark />}
                  <StackedBar aligned={d.summary.aligned} mixed={d.summary.mixed} conflicts={d.summary.conflicts} onDark />
                  <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                    {(
                      [
                        ["Aligned", d.summary.aligned],
                        ["Mixed", d.summary.mixed],
                        ["Conflicts", d.summary.conflicts],
                        ["Unknown", d.summary.unknown],
                      ] as [Label, number][]
                    ).map(([l, v]) => (
                      <li key={l} className="flex items-center gap-1.5">
                        <StatusShape label={l} onDark />
                        <span className="num text-status text-white">{money0(v)}</span>
                        <span className="font-serif text-status text-white">{CHIP_WORD[l]}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          )}
        </motion.div>

        {!d.generic && d.flagIds.length > 0 && (
          <motion.div variants={item}>
            <PlanCard profile={d.profile} />
          </motion.div>
        )}

        {!d.generic && (
          <motion.div variants={item}>
            <Card tone="coral" onClick={() => router.push("/report")}>
              <CardHeader label="October report" extra={<NewPill />} />
              <p className="mt-3 font-serif text-body text-black">
                {plural(d.flagIds.length, "merchant")} worth a closer look. See where →
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip label="Conflicts" count={count("Conflicts")} />
                <Chip label="Mixed" count={count("Mixed")} />
                <Chip label="Unknown" count={count("Unknown")} />
              </div>
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
