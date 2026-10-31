"use client";

import { useEffect, useState } from "react";
import { Card } from "./Card";
import { Shimmer } from "./AISummary";
import { ChevronRight, Sparkle } from "./icons";
import { merchantById } from "@/data/merchants";
import { getPlan, type PlanResult } from "@/lib/ai/client";
import { profileHash } from "@/lib/engine";
import { useApp, useUI } from "@/lib/store";
import type { Profile } from "@/lib/types";

const usd = (n: number) => `${n < 0 ? "−" : "+"}$${Math.abs(n) % 1 ? Math.abs(n).toFixed(2) : Math.abs(n)}`;

/** Optional, engine-computed moves with an AI explanation. The person picks; nothing is ranked as best. */
export function PlanCard({ profile, compact = false }: { profile: Profile; compact?: boolean }) {
  const aiMode = useApp((s) => s.aiMode);
  const kept = useApp((s) => s.kept);
  const openSheet = useUI((s) => s.openSheet);
  const key = `${aiMode}:${profileHash(profile)}:${kept.join(",")}`;
  const [state, setState] = useState<{ key: string; plan: PlanResult | null } | null>(null);

  useEffect(() => {
    let alive = true;
    getPlan(profile, kept, aiMode).then((plan) => alive && setState({ key, plan }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const plan = state?.key === key ? state.plan : undefined;
  if (plan === null) return null;

  if (compact) {
    if (plan === undefined) return <Shimmer lines={3} label="Finding your options" />;
    return (
      <div>
        <ul>
          {plan.options.slice(0, 3).map((o) => (
            <li key={`${o.merchantId}-${o.alternative.name}`} className="border-t border-hairline first:border-t-0">
              <button type="button" onClick={() => openSheet({ type: "merchant", id: o.merchantId })} className="flex min-h-14 w-full items-center gap-2 py-2 text-left">
                <span className="caps min-w-0 flex-1 truncate text-label text-black">
                  {merchantById[o.merchantId].name} → {o.alternative.name}
                </span>
                <span className="num rounded-tile bg-royal-tint px-2 py-1 text-micro text-royal">{usd(o.monthlyCostDelta)}</span>
                <ChevronRight size={18} className="shrink-0 text-ink-2" />
              </button>
            </li>
          ))}
        </ul>
        {plan.options.length === 0 && <p className="font-serif text-body text-ink-2">Nothing to change. You&apos;re all set.</p>}
      </div>
    );
  }

  return (
    <Card tone="white">
      <p className="caps flex items-center gap-1.5 text-label text-ink-2">
        <Sparkle size={15} strokeWidth={2.2} className="text-royal" />
        Your next step
      </p>
      {plan === undefined ? (
        <div className="mt-3">
          <Shimmer lines={3} label="Working out your options" />
        </div>
      ) : (
        <>
          <p className="mt-3 font-serif text-body text-black">{plan.narrative}</p>
          {plan.options.length > 0 && (
            <ul className="mt-3">
              {plan.options.map((o) => (
                <li key={`${o.merchantId}-${o.alternative.name}`} className="border-t border-hairline">
                  <button
                    type="button"
                    onClick={() => openSheet({ type: "merchant", id: o.merchantId })}
                    className="flex min-h-14 w-full items-center gap-2 py-2 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="caps block truncate text-label text-black">
                        {merchantById[o.merchantId].name} → {o.alternative.name}
                      </span>
                      <span className="font-serif text-caption text-ink-2">
                        {usd(o.monthlyCostDelta)} a month · {o.pctAfter}% match
                      </span>
                    </span>
                    <ChevronRight size={18} className="text-ink-2" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {plan.questions[0] && <p className="mt-2 font-serif text-caption italic text-ink-2">{plan.questions[0]}</p>}
          <p className="mt-2 font-serif text-micro text-ink-2">Optional. Keeping things as they are is always fine.</p>
        </>
      )}
    </Card>
  );
}
