"use client";

import { useState } from "react";
import { Close, Repeat, Store } from "../ui/icons";
import { CategoryIcon } from "./CategoryIcon";
import { merchantById } from "@/data/merchants";
import { targetProgress } from "@/lib/tally/analysis";
import { useApp, useUI } from "@/lib/store";

const usd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function TargetRow({ category }: { category: string }) {
  const t = useApp((s) => s.targets[category]);
  const edit = useApp((s) => s.tallyEditTarget);
  const remove = useApp((s) => s.tallyRemoveTarget);
  const [err, setErr] = useState<string | null>(null);
  if (!t) return null;
  const p = targetProgress(category, t.amount);
  const step = (d: number) => setErr(edit(category, t.amount + d)[0] ?? null);
  return (
    <li className="rounded-row bg-white px-3.5 py-3">
      <div className="flex items-center gap-3">
        <CategoryIcon name={category} size={40} />
        <span className="caps min-w-0 flex-1 truncate text-label text-black">{category}</span>
        <button type="button" aria-label={`Lower ${category} cap`} onClick={() => step(-5)} className="num flex h-10 w-10 items-center justify-center rounded-tile bg-fill text-row">−</button>
        <span className="num min-w-[52px] text-center text-row text-black">{usd(t.amount)}</span>
        <button type="button" aria-label={`Raise ${category} cap`} onClick={() => step(5)} className="num flex h-10 w-10 items-center justify-center rounded-tile bg-fill text-row">+</button>
        <button type="button" aria-label={`Remove ${category} cap`} onClick={() => remove(category)} className="flex h-10 w-8 items-center justify-center text-ink-2"><Close size={18} /></button>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-fill" aria-hidden>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round((t.amount / Math.max(p.spent, t.amount)) * 100))}%`, backgroundColor: p.over ? "#F2C12E" : "#1D3BC4" }} />
        </div>
        <span className="num text-micro text-ink-2">{usd(p.spent)} now</span>
      </div>
      {err && <p role="alert" className="mt-1 font-serif text-micro text-ink-2">{err}</p>}
    </li>
  );
}

export function ActivePlans() {
  const targets = useApp((s) => s.targets);
  const reviewList = useApp((s) => s.reviewList);
  const consideration = useApp((s) => s.consideration);
  const removeReview = useApp((s) => s.tallyRemoveReview);
  const removeConsideration = useApp((s) => s.tallyRemoveConsideration);
  const openSheet = useUI((s) => s.openSheet);
  const cats = Object.keys(targets);
  if (cats.length + reviewList.length + consideration.length === 0) return null;

  return (
    <section>
      <h2 className="caps mb-3 text-label text-ink-2">Your plans</h2>
      <ul className="flex flex-col gap-2">
        {cats.map((c) => (
          <TargetRow key={c} category={c} />
        ))}
        {reviewList.map((id) => (
          <li key={id} className="flex items-center gap-3 rounded-row bg-white px-3.5 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-row bg-royal-tint text-royal"><Repeat size={20} /></span>
            <span className="caps min-w-0 flex-1 truncate text-label text-black">Review {merchantById[id]?.name}</span>
            <button type="button" aria-label={`Remove ${merchantById[id]?.name} review`} onClick={() => removeReview(id)} className="flex h-10 w-8 items-center justify-center text-ink-2"><Close size={18} /></button>
          </li>
        ))}
        {consideration.map((c) => (
          <li key={`${c.merchantId}-${c.alt}`} className="flex items-center gap-3 rounded-row bg-white px-3.5 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-row bg-royal-tint text-royal"><Store size={20} /></span>
            <button type="button" onClick={() => openSheet({ type: "merchant", id: c.merchantId })} className="caps min-w-0 flex-1 truncate text-left text-label text-black">{c.alt}</button>
            <button type="button" aria-label={`Remove ${c.alt}`} onClick={() => removeConsideration(c.merchantId, c.alt)} className="flex h-10 w-8 items-center justify-center text-ink-2"><Close size={18} /></button>
          </li>
        ))}
      </ul>
    </section>
  );
}
