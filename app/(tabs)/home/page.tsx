"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Screen } from "@/components/Screen";
import { Card, CardHeader, Delta, NewPill, Sparkline, StackedBar } from "@/components/ui/Card";
import { CountUp, money0 } from "@/components/ui/CountUp";
import { Gear } from "@/components/ui/icons";
import { StatusShape } from "@/components/ui/Status";
import { september, DEMO_TODAY_LABEL } from "@/data/demo";
import { dailyCumulative } from "@/data/transactions";
import { useApp, useUI, type Snapshot } from "@/lib/store";
import type { Label } from "@/lib/types";
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

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function Chip({ label, count }: { label: Label; count: number }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3">
      <StatusShape label={label} />
      <span className="font-serif text-status text-ink-2">
        {count} {label}
      </span>
    </span>
  );
}

export default function HomePage() {
  const router = useRouter();
  const d = useDerived();
  const name = useApp((s) => s.name);
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

      <h1 className="head mt-4 text-h2 text-black">
        Hi, <span className="text-royal">{name || "there"}</span>
      </h1>

      <motion.div variants={stagger} initial="hidden" animate="show" className="mt-6 flex flex-col gap-3">
        <motion.div variants={item}>
          <Card
            onClick={() => {
              useUI.setState({ spendingFilter: "all" });
              router.push("/spending");
            }}
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
                className="mt-4 h-11 rounded-full bg-white px-5 font-display text-label uppercase tracking-[0.05em] text-royal"
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
                  <span className="caps text-label text-white">{money0(d.summary.unknown)} unknown</span>
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
              <CardHeader label="Matches your values" onDark />
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
                    <p className="num text-hero text-white">
                      <CountUp key={`${from.pct}-${pct}`} from={from.pct ?? 0} to={pct} format={(n) => `${Math.round(n)}%`} delay={0.2} />
                    </p>
                    <p className="mb-1 flex items-center gap-2 rounded-full bg-white px-3 py-1.5">
                      <StatusShape label="Conflicts" />
                      <span className="num text-label text-black">
                        <CountUp key={`c-${from.conflicts}-${now.conflicts}`} from={from.conflicts} to={now.conflicts} delay={0.3} />
                      </span>
                      <span className="font-serif text-status text-ink-2">{now.conflicts === 1 ? "conflict" : "conflicts"}</span>
                    </p>
                  </div>
                  <p className="mt-2 font-serif text-caption text-white">of your rated spending</p>
                  {delta && <Delta {...delta} onDark />}
                  <StackedBar aligned={d.summary.aligned} mixed={d.summary.mixed} conflicts={d.summary.conflicts} onDark />
                  <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                    {(
                      [
                        ["Aligned", d.summary.aligned],
                        ["Mixed", d.summary.mixed],
                        ["Conflicts", d.summary.conflicts],
                      ] as [Label, number][]
                    ).map(([l, v]) => (
                      <li key={l} className="flex items-center gap-1.5">
                        <StatusShape label={l} onDark />
                        <span className="num text-status text-white">{money0(v)}</span>
                        <span className="font-serif text-status text-white">{l.toLowerCase()}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          )}
        </motion.div>

        {!d.generic && (
          <motion.div variants={item}>
            <Card tone="coral" onClick={() => router.push("/report")}>
              <CardHeader label="October report" extra={<NewPill />} />
              <p className="mt-3 font-serif text-body text-black">
                {plural(d.flagIds.length, "merchant")} flagged. See where →
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

      <p className="mt-8 text-center font-serif text-caption text-ink-2">Ratings are illustrative demo data.</p>
    </Screen>
  );
}
