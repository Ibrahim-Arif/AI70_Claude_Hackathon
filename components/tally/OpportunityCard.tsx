"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "../ui/Buttons";
import { Close, Info } from "../ui/icons";
import { CategoryIcon } from "./CategoryIcon";
import { merchantById } from "@/data/merchants";
import { subscriptionProposal, subscriptions } from "@/lib/tally/analysis";
import { useApp, useUI } from "@/lib/store";
import type { Ctx, Opportunity } from "@/lib/tally/types";

const usd = (n: number) => `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

/** One idea, one big button. The reasoning is a tap away, never in the way. */
export function OpportunityCard({ o, ctx }: { o: Opportunity; ctx: Ctx }) {
  const openSheet = useUI((s) => s.openSheet);
  const dismiss = useApp((s) => s.tallyDismiss);
  const [why, setWhy] = useState(false);

  const pendingSubs = subscriptions().filter((s) => !ctx.reviewList.includes(s.merchantId));
  const title = o.kind === "target" ? o.primary.category! : o.kind === "subscriptions" ? "Subscriptions" : merchantById[o.primary.merchantId!].name;
  const iconName = o.kind === "values" ? "Shopping" : title;
  const pill =
    o.kind === "target" ? `Save ${usd(o.impact!)}` : o.kind === "subscriptions" ? `${usd(o.impact!)}/mo` : o.impact! >= 0 ? `Save ${usd(o.impact!)}` : `+${usd(o.impact!)}/mo`;
  const label = o.kind === "target" ? `Cap at ${usd(o.primary.proposed!)}` : o.kind === "subscriptions" ? `Review ${pendingSubs.length}` : "Add to my list";

  const approve = () =>
    openSheet({
      type: "tallyConfirm",
      title: o.kind === "subscriptions" ? "Subscriptions" : title,
      source: o.id,
      actions: o.kind === "subscriptions" ? pendingSubs.map((s) => subscriptionProposal(s.merchantId)) : [o.primary],
    });

  return (
    <motion.li layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="rounded-card border border-hairline bg-white p-4">
      <div className="flex items-center gap-3">
        <CategoryIcon name={iconName} />
        <div className="min-w-0 flex-1">
          <p className="caps truncate text-row text-black">{title}</p>
          <p className="mt-0.5 flex items-center gap-2">
            {o.kind === "target" && <span className="num text-micro text-ink-2">{usd(o.primary.current!)} → {usd(o.primary.proposed!)}</span>}
            <span className="num inline-block rounded-tile bg-royal-tint px-2 py-0.5 text-micro text-royal">{pill}</span>
          </p>
        </div>
        <button type="button" aria-label="Not for me" onClick={() => dismiss(o.kind === "target" ? `target:${o.primary.category}` : o.kind === "subscriptions" ? "subs" : o.id)} className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-2">
          <Close size={20} />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <PrimaryButton className="h-12 flex-1" onClick={approve}>{label}</PrimaryButton>
        <button type="button" aria-label="Why this idea" aria-expanded={why} onClick={() => setWhy((v) => !v)} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-pill ${why ? "bg-royal text-white" : "bg-fill text-ink-2"}`}>
          <Info size={22} />
        </button>
      </div>

      {o.secondary && (
        <SecondaryButton className="mt-2 h-11" onClick={() => openSheet({ type: "merchant", id: o.secondary!.merchantId })}>Compare options</SecondaryButton>
      )}

      {why && (
        <div className="mt-3 rounded-row bg-fill px-3.5 py-3">
          <p className="font-serif text-caption text-black">{o.why}</p>
          {o.valuesNote && <p className="mt-1.5 font-serif text-caption text-royal">{o.valuesNote}</p>}
          <p className="mt-1.5 font-serif text-micro italic text-ink-2">{o.uncertainty}</p>
        </div>
      )}
    </motion.li>
  );
}
