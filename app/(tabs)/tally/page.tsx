"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Screen } from "@/components/Screen";
import { ActivePlans } from "@/components/tally/ActivePlans";
import { AskBar, AskLoading, AskResult } from "@/components/tally/AskTally";
import { OpportunityCard } from "@/components/tally/OpportunityCard";
import { useTallyCtx } from "@/components/tally/useTallyCtx";
import { CountUp, money0 } from "@/components/ui/CountUp";
import { PieChart } from "@/components/ui/icons";
import { Wordmark } from "@/components/ui/Wordmark";
import type { TallyReply } from "@/lib/ai/client";
import { learned, opportunities, totalSpend } from "@/lib/tally/analysis";
import { useApp } from "@/lib/store";

const usd = (n: number) => `$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function TallyPage() {
  const router = useRouter();
  const ctx = useTallyCtx();
  const forget = useApp((s) => s.tallyForget);
  const [reply, setReply] = useState<TallyReply | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  const spent = totalSpend();
  const left = Math.round((ctx.budget - spent) * 100) / 100;
  const planned = Object.values(ctx.targets).reduce((s, t) => s + t.savings, 0);
  const recs = opportunities(ctx, 3);
  const lessons = learned(ctx).filter((l) => l.id !== "targets");

  return (
    <Screen tabs footer={<AskBar ctx={ctx} onBusy={(b) => { setBusy(b); if (b) top.current?.scrollIntoView({ behavior: "smooth" }); }} onReply={setReply} showChips={reply === undefined} />}>
      <div ref={top} />
      <div className="mt-2 flex items-start justify-between">
        <h1 className="m-0">
          <Wordmark large />
        </h1>
        <button type="button" aria-label="Spending breakdown" onClick={() => router.push("/budget")} className="flex h-12 w-12 items-center justify-center rounded-row bg-white text-royal">
          <PieChart size={24} />
        </button>
      </div>

      <section className="mt-5 rounded-card border border-hairline bg-white p-5">
        <div className="flex items-end justify-between gap-3">
          <p className="num text-cardnum text-black"><CountUp to={spent} format={money0} /></p>
          <p className={`num mb-1 rounded-tile px-2.5 py-1 text-label ${left >= 0 ? "bg-royal-tint text-royal" : "bg-coral-tint text-black"}`}>
            {left >= 0 ? `${usd(left)} left` : `${usd(left)} over`}
          </p>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-fill" aria-hidden>
          <motion.div className="h-full rounded-full" style={{ backgroundColor: left >= 0 ? "#1D3BC4" : "#E05A2B" }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, (spent / ctx.budget) * 100)}%` }} transition={{ type: "spring", stiffness: 160, damping: 26 }} />
        </div>
        {planned > 0 && <p className="num mt-3 inline-block rounded-tile bg-royal-tint px-2.5 py-1 text-label text-royal">−{usd(planned)}/mo planned</p>}
      </section>

      <div className="mt-5 flex flex-col gap-5">
        {busy && <AskLoading />}
        {!busy && reply !== undefined && <AskResult reply={reply} onClose={() => setReply(undefined)} />}

        {recs.length > 0 && (
          <motion.ul layout className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {recs.map((o) => (
                <OpportunityCard key={o.id} o={o} ctx={ctx} />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}

        <ActivePlans />

        {lessons.length > 0 && (
          <section>
            <button type="button" aria-expanded={prefs} onClick={() => setPrefs((v) => !v)} className="caps flex min-h-11 w-full items-center justify-between text-label text-ink-2">
              <span>What Tally remembers ({lessons.length})</span>
              <span aria-hidden>{prefs ? "−" : "+"}</span>
            </button>
            {prefs && (
              <ul className="flex flex-col gap-2">
                {lessons.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 rounded-row bg-white px-4 py-3">
                    <span className="min-w-0 flex-1 font-serif text-caption text-black">{l.text}</span>
                    <button type="button" onClick={() => forget(l.id)} className="min-h-11 shrink-0 font-serif text-caption text-royal underline underline-offset-4">Undo</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </Screen>
  );
}
