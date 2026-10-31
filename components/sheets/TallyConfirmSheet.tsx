"use client";

import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "../ui/Buttons";
import { Check, Info } from "../ui/icons";
import { CategoryIcon } from "../tally/CategoryIcon";
import { merchantById } from "@/data/merchants";
import { useApp, useUI } from "@/lib/store";
import type { ActionProposal } from "@/lib/tally/types";
import type { ApplyResult } from "@/lib/tally/analysis";

const usd = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

export function change(a: ActionProposal): string {
  switch (a.type) {
    case "set_target":
      return `${a.category} capped at ${usd(a.proposed!)} a month (you spent ${usd(a.current!)} this month)`;
    case "review_subscriptions":
      return `${merchantById[a.merchantId!]?.name} added to your review list`;
    case "add_to_consideration":
      return `${a.altName} added to your consideration list`;
    case "set_monthly_budget":
      return `Monthly budget set to ${usd(a.proposed!)}`;
  }
}

function Row({ a, on, toggle }: { a: ActionProposal; on: boolean; toggle: () => void }) {
  const [why, setWhy] = useState(false);
  const name = a.type === "set_target" ? a.category! : a.type === "review_subscriptions" ? merchantById[a.merchantId!]?.name : a.altName!;
  return (
    <li className="rounded-row bg-white px-3.5 py-3">
      <div className="flex items-center gap-3">
        <button type="button" role="checkbox" aria-checked={on} aria-label={a.description} onClick={toggle} className="flex min-h-11 flex-1 items-center gap-3 text-left">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-tile border-2 ${on ? "border-royal bg-royal text-white" : "border-hairline bg-white"}`}>
            {on && <Check size={18} strokeWidth={3} />}
          </span>
          <CategoryIcon name={a.type === "set_target" ? a.category! : a.type === "review_subscriptions" ? "Subscriptions" : "Shopping"} size={38} />
          <span className="min-w-0 flex-1">
            <span className="caps block truncate text-label text-black">{name}</span>
            <span className="num block text-micro text-ink-2">
              {a.type === "set_target" ? `${usd(a.current!)} → ${usd(a.proposed!)}` : a.type === "review_subscriptions" ? "Review" : "Add to list"}
            </span>
          </span>
          {a.impact !== null && (
            <span className="num rounded-tile bg-royal-tint px-2 py-1 text-label text-royal">
              {a.impact >= 0 ? `−${usd(a.impact)}` : `+${usd(-a.impact)}`}
            </span>
          )}
        </button>
        <button type="button" aria-label="Why" aria-expanded={why} onClick={() => setWhy((v) => !v)} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-pill ${why ? "bg-royal text-white" : "bg-fill text-ink-2"}`}>
          <Info size={20} />
        </button>
      </div>
      {why && (
        <div className="mt-2 rounded-row bg-fill px-3 py-2.5">
          <p className="font-serif text-caption text-black">{a.explanation}</p>
          {a.uncertainty && <p className="mt-1 font-serif text-micro italic text-ink-2">{a.uncertainty}</p>}
        </div>
      )}
    </li>
  );
}

/** Shows exactly what will change, lets the person pick, applies only what they approve, then reports what changed. */
export function TallyConfirmSheet({ title, source, actions }: { title: string; source: string; actions: ActionProposal[] }) {
  const close = useUI((s) => s.closeSheet);
  const [picked, setPicked] = useState<string[]>(actions.map((a) => a.id));
  const [result, setResult] = useState<ApplyResult | null>(null);

  if (result) {
    return (
      <div className="pt-2">
        <h2 className="head text-h2 text-black">Done</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {result.applied.map((a) => (
            <li key={a.id} className="flex items-start gap-2.5 font-serif text-body text-black">
              <Check size={20} strokeWidth={2.6} className="mt-1 shrink-0 text-royal" />
              {change(a)}
            </li>
          ))}
        </ul>
        {result.rejected.length > 0 && (
          <div className="mt-4 rounded-row bg-amber-tint px-4 py-3">
            <p className="caps text-micro text-ink-2">Not applied</p>
            {result.rejected.map((r) => (
              <p key={r.action.id} className="mt-1 font-serif text-caption text-black">
                {r.action.description}: {r.errors.join(" ")}
              </p>
            ))}
          </div>
        )}
                <PrimaryButton className="mt-6" onClick={close}>
          Done
        </PrimaryButton>
      </div>
    );
  }

  const chosen = actions.filter((a) => picked.includes(a.id));
  const total = chosen.filter((a) => a.type === "set_target").reduce((s, a) => s + (a.impact ?? 0), 0);

  return (
    <div className="pt-2">
      <h2 className="head text-h2 text-black">{title}</h2>
      <p className="mt-1 font-serif text-caption text-ink-2">Nothing changes until you approve.</p>
      <ul className="mt-4 flex flex-col gap-2">
        {actions.map((a) => (
          <Row key={a.id} a={a} on={picked.includes(a.id)} toggle={() => setPicked((p) => (p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id]))} />
        ))}
      </ul>
      {total > 0 && <p className="num mt-3 inline-block rounded-tile bg-royal-tint px-2.5 py-1 text-label text-royal">−{usd(Math.round(total * 100) / 100)}/mo</p>}
      <p className="mt-3 font-serif text-micro text-ink-2">Only updates Tally. Nothing is cancelled or charged.</p>
      <div className="mt-5 flex flex-col gap-3">
        <PrimaryButton disabled={chosen.length === 0} onClick={() => setResult(useApp.getState().tallyApply(chosen, source))}>
          {chosen.length === actions.length && actions.length > 1 ? "Approve all" : `Approve ${chosen.length}`}
        </PrimaryButton>
        <SecondaryButton onClick={close}>Not now</SecondaryButton>
      </div>
    </div>
  );
}
