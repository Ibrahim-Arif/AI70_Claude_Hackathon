"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { Screen } from "@/components/Screen";
import { BackButton } from "@/components/ui/Buttons";
import { Card, CardHeader, Delta, StackedBar } from "@/components/ui/Card";
import { CountUp, money0 } from "@/components/ui/CountUp";
import { MerchantRow } from "@/components/ui/MerchantRow";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { hasDifferentParent, parentName } from "@/data/merchants";
import { november, september } from "@/data/demo";
import { useApp, useUI } from "@/lib/store";
import { StatusShape } from "@/components/ui/Status";
import type { Label } from "@/lib/types";
import { useDerived } from "@/lib/useDerived";
import { isPreferRule } from "@/lib/values";

function Section({ children, title, shape }: { children: ReactNode; title?: string; shape?: Label }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mt-8"
    >
      {title && (
        <h2 className="caps mb-3 flex items-center gap-2 text-label text-black">
          {shape && <StatusShape label={shape} size={12} />}
          {title}
        </h2>
      )}
      {children}
    </motion.section>
  );
}

function October() {
  const d = useDerived();
  const openSheet = useUI((s) => s.openSheet);
  const profile = d.profile;
  const pct = d.summary.alignmentPct;
  const flagged = d.flagIds.slice(0, 3).map((id) => d.rows.find((r) => r.merchant.id === id)!);
  const unknown = d.rows.filter((r) => r.result.label === "Unknown");
  const untracked = profile.preferences.filter((p) => p.type === "unsupported");

  return (
    <>
      <Section>
        <Card tone="royal">
          <CardHeader label="Matches your values" chevron={false} onDark />
          {pct === null ? (
            <p className="head mt-3 text-h2 text-white">Not enough data yet</p>
          ) : (
            <>
              <p className="num mt-3 text-hero text-white">
                <CountUp to={pct} format={(n) => `${Math.round(n)}%`} />
              </p>
              <p className="mt-2 font-serif text-caption text-white">of your rated October spending</p>
              <Delta
                direction={pct >= september.alignmentPct ? "up" : "down"}
                value={`${Math.abs(pct - september.alignmentPct)} pts`}
                caption="vs. Sept"
                tone={pct >= september.alignmentPct ? "good" : "bad"}
                onDark
              />
              <StackedBar aligned={d.summary.aligned} mixed={d.summary.mixed} conflicts={d.summary.conflicts} onDark />
            </>
          )}
        </Card>
      </Section>

      <Section title="Top flagged" shape="Conflicts">
        {flagged.length ? (
          <div className="flex flex-col gap-3">
            {flagged.map(({ merchant: m, spend, result }) => (
              <MerchantRow
                key={m.id}
                name={m.name}
                ownedBy={hasDifferentParent(m) ? parentName(m) : undefined}
                amount={spend}
                label={result.label}
                onClick={() => openSheet({ type: "merchant", id: m.id })}
              />
            ))}
          </div>
        ) : (
          <p className="font-serif text-body text-ink-2">Nothing flagged this month.</p>
        )}
      </Section>

      <Section title="Unknown" shape="Unknown">
        <p className="-mt-1 mb-3 font-serif text-caption text-ink-2">
          {money0(d.summary.unknown)} went to places without reliable ratings. It isn&apos;t counted as aligned.
        </p>
        <div className="flex flex-col gap-3">
          {unknown.map(({ merchant: m, spend, result }) => (
            <MerchantRow
              key={m.id}
              name={m.name}
              amount={spend}
              label="Unknown"
              supportsLocal={result.supports.some(isPreferRule)}
              onClick={() => openSheet({ type: "merchant", id: m.id })}
            />
          ))}
        </div>
      </Section>

      <Section title="Not tracked yet">
        {untracked.length ? (
          <ul className="flex flex-col gap-3">
            {untracked.map((p) => (
              <li key={p.id} className="rounded-row bg-amber-tint px-4 py-4">
                <p className="caps text-label text-black">{p.label}</p>
                <p className="mt-1 font-serif text-caption text-ink-2">We&apos;ve saved it and will tell you when we have reliable data.</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-serif text-body text-ink-2">Everything you picked is tracked.</p>
        )}
      </Section>
    </>
  );
}

function November() {
  const goal = useApp((s) => s.goal);
  const g = november.goal;
  const target = goal?.target ?? g.target;
  const label = goal?.label ?? g.label;
  const progress = Math.min(1, (g.octSpend - g.spend) / Math.max(1, g.octSpend - target));

  return (
    <>
      <p className="mt-4 font-serif text-caption text-ink-2">Demo preview of next month.</p>
      <Section>
        <Card tone="royal">
          <CardHeader label="Matches your values" chevron={false} onDark />
          <p className="num mt-3 text-hero text-white">
            <CountUp to={november.alignmentPct} format={(n) => `${Math.round(n)}%`} />
          </p>
          <p className="mt-2 font-serif text-caption text-white">of your rated November spending</p>
          <Delta direction="up" value={`${november.deltaVsOct} pts`} caption="vs. Oct" onDark />
        </Card>
      </Section>

      <Section title="Your goal">
        <Card
          tone="sky"
          footer={
            <>
              <span className="caps text-label text-black">Goal: under {money0(target)}</span>
              <span className="font-serif text-caption italic text-ink-2">Almost there</span>
            </>
          }
        >
          <CardHeader label={label} chevron={false} />
          <div className="mt-3 flex items-baseline gap-3">
            <span className="num text-label text-ink-2 line-through decoration-1">{money0(g.octSpend)}</span>
            <span className="num text-cardnum text-black">
              <CountUp from={g.octSpend} to={g.spend} format={money0} delay={0.3} />
            </span>
          </div>
          <Delta direction="down" value={money0(Math.abs(g.deltaVsOct))} caption="vs. Oct" />
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-fill" role="img" aria-label={`${Math.round(progress * 100)}% of the way to your goal`}>
            <motion.div
              className="h-full rounded-full bg-royal"
              initial={{ width: 0 }}
              whileInView={{ width: `${progress * 100}%` }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 120, damping: 24, delay: 0.3 }}
            />
          </div>
        </Card>
      </Section>

      <Section title="Unknown" shape="Unknown">
        <Card>
          <p className="num text-cardnum text-black">{money0(november.unratedSpend)}</p>
          <p className="mt-1 font-serif text-caption text-ink-2">at {november.unratedPlaces} places without ratings</p>
        </Card>
      </Section>

      <Section title="Not tracked yet">
        <Card tone="amber">
          <p className="font-serif text-body text-black">{november.untrackedValues} value not tracked yet.</p>
          <p className="mt-1 font-serif text-caption text-ink-2">We&apos;ll tell you when we have reliable data.</p>
        </Card>
      </Section>
    </>
  );
}

export default function ReportPage() {
  const tab = useUI((s) => s.reportTab);
  return (
    <Screen tabs>
      <BackButton />
      <h1 className="head mt-2 text-h2 text-black">{tab === "october" ? "October report" : "November preview"}</h1>
      <div className="mt-5">
        <SegmentedControl
          ariaLabel="Report month"
          options={[
            { value: "october", label: "October" },
            { value: "november", label: "November" },
          ]}
          value={tab}
          onChange={(v) => useUI.setState({ reportTab: v })}
        />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {tab === "october" ? <October /> : <November />}
        </motion.div>
      </AnimatePresence>
      <p className="mt-10 text-center font-serif text-caption text-ink-2">Ratings are illustrative demo data.</p>
    </Screen>
  );
}
