"use client";

import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "../ui/Buttons";
import { Shimmer } from "../ui/AISummary";
import { Close, Info } from "../ui/icons";
import { CategoryIcon } from "./CategoryIcon";
import { askTally, type TallyReply } from "@/lib/ai/client";
import { useApp, useUI } from "@/lib/store";
import type { Ctx } from "@/lib/tally/types";

const usd = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
const SUGGESTIONS = ["Save $100 this month", "Am I spending too much on food?", "Spend more in line with my values"];

/** Natural-language input, pinned above the tab bar. It complements the structured recommendations. */
export function AskBar({ ctx, onReply, onBusy, showChips = true }: { ctx: Ctx; onReply: (r: TallyReply | null) => void; onBusy: (b: boolean) => void; showChips?: boolean }) {
  const aiMode = useApp((s) => s.aiMode);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const ask = async (text: string) => {
    if (!text.trim() || busy) return;
    setQ(text);
    setBusy(true);
    onBusy(true);
    const r = await askTally(text.trim(), ctx, aiMode);
    onReply(r);
    setBusy(false);
    onBusy(false);
  };

  return (
    <div>
      {showChips && (
      <div className="no-scrollbar -mx-6 mb-2 flex gap-2 overflow-x-auto px-6">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => void ask(s)} disabled={busy} className="caps min-h-10 shrink-0 rounded-pill border-2 border-hairline bg-white px-3.5 text-seg text-black disabled:opacity-50">
            {s}
          </button>
        ))}
      </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(q);
        }}
        className="flex items-center gap-2 rounded-row border-2 border-black bg-white p-1.5 pl-4"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask Tally"
          aria-label="Ask Tally"
          maxLength={300}
          className="min-w-0 flex-1 bg-transparent font-serif text-body text-black outline-none placeholder:text-ink-3"
        />
        <button type="submit" disabled={!q.trim() || busy} className="caps h-11 shrink-0 rounded-tile bg-royal px-4 text-seg text-white disabled:opacity-40">
          Ask
        </button>
      </form>
    </div>
  );
}

export function AskLoading() {
  return (
    <section className="rounded-card border border-hairline bg-white p-5">
      <Shimmer lines={3} label="Looking at your spending" />
    </section>
  );
}

/** The agent's answer: a plan worked out in code, with the exact before and after, ready to approve. */
export function AskResult({ reply, onClose }: { reply: TallyReply | null; onClose: () => void }) {
  const openSheet = useUI((s) => s.openSheet);
  const [trade, setTrade] = useState(false);
  if (!reply) {
    return (
      <section className="rounded-card border border-hairline bg-white p-5">
        <p className="font-serif text-body text-black">Couldn&apos;t reach Tally just now. Your ideas below still work.</p>
        <SecondaryButton className="mt-3" onClick={onClose}>Close</SecondaryButton>
      </section>
    );
  }
  const { answer } = reply;
  const plan = answer.plan;
  const proposals = answer.proposals ?? [];

  return (
    <section className="rounded-card border-2 border-royal bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="head text-[22px] leading-[26px] text-black">{answer.title}</h2>
        <button type="button" aria-label="Close" onClick={onClose} className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center text-ink-2"><Close size={20} /></button>
      </div>

      {plan && plan.items.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {plan.items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 rounded-row bg-fill px-3 py-2.5">
              <CategoryIcon name={i.type === "set_target" ? i.category! : "Subscriptions"} size={38} />
              <span className="min-w-0 flex-1">
                <span className="caps block truncate text-label text-black">{i.type === "set_target" ? i.category : "Subscription"}</span>
                {i.proposed !== null && <span className="num block text-micro text-ink-2">{usd(i.current!)} → {usd(i.proposed)}</span>}
              </span>
              <span className="num rounded-tile bg-royal-tint px-2 py-1 text-label text-royal">{i.type === "review_subscriptions" ? `≤ ${usd(i.impact!)}` : `−${usd(i.impact!)}`}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {answer.bullets.slice(0, 3).map((b) => (
            <li key={b} className="font-serif text-body text-black">{b}</li>
          ))}
        </ul>
      )}

      {plan && plan.tradeoffs.length > 0 && (
        <div className="mt-3">
          <button type="button" aria-expanded={trade} onClick={() => setTrade((v) => !v)} className="flex min-h-11 items-center gap-2 font-serif text-caption italic text-royal underline underline-offset-4">
            <Info size={18} /> What you&apos;d trade
          </button>
          {trade && (
            <ul className="rounded-row bg-fill px-3.5 py-3">
              {plan.tradeoffs.map((t) => (
                <li key={t} className="py-0.5 font-serif text-caption text-black">{t}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {proposals.length > 0 && (
        <PrimaryButton className="mt-3 h-12" onClick={() => openSheet({ type: "tallyConfirm", title: plan ? `Save ${usd(plan.objective)}` : answer.title, source: "ask", actions: proposals })}>
          Review and approve
        </PrimaryButton>
      )}
    </section>
  );
}
