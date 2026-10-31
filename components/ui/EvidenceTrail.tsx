"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { SecondaryButton } from "./Buttons";
import { Shimmer } from "./AISummary";
import { ExternalLink, Sparkle } from "./icons";
import { merchantById } from "@/data/merchants";
import { fmtDate } from "@/lib/ai/explainTemplate";
import { getResearch } from "@/lib/ai/client";
import { ISSUE_WORD, type Research } from "@/lib/ai/research";
import type { LabelResult } from "@/lib/engine";
import { useApp } from "@/lib/store";
import type { Profile } from "@/lib/types";

/** On-demand, citation-checked research. Every claim links to the rating it came from. */
export function EvidenceTrail({ merchantId, result, profile }: { merchantId: string; result: LabelResult; profile: Profile }) {
  const aiMode = useApp((s) => s.aiMode);
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [r, setR] = useState<Research | null>(null);

  const run = async () => {
    setState("loading");
    setR(await getResearch(merchantById[merchantId], result, profile, aiMode));
    setState("done");
  };

  if (state === "idle") {
    return <SecondaryButton onClick={run}>Show me the evidence</SecondaryButton>;
  }
  if (state === "loading" || !r) {
    return (
      <section className="rounded-row bg-royal-tint px-4 py-4">
        <Shimmer lines={4} label="Checking every claim against the ratings" />
      </section>
    );
  }
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className="rounded-row bg-royal-tint px-4 py-4">
      <p className="caps mb-2 flex items-center gap-1.5 text-micro text-ink-2">
        <Sparkle size={14} strokeWidth={2.2} className="text-royal" />
        Evidence trail
      </p>
      {r.source === "live" && <p className="font-serif text-summary italic text-ink-2">{r.summary}</p>}

      <p className="caps mb-2 mt-1 text-micro text-ink-2">What we found</p>
      <ul className="flex flex-col gap-3">
        {r.findings.map((f) => (
          <li key={f.issue} className="rounded-row bg-white px-3.5 py-3">
            <p className="font-serif text-caption text-black">{f.text}</p>
            <a
              href={f.cite.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 flex min-h-11 items-center gap-1.5 font-serif text-micro text-ink-2"
            >
              <ExternalLink size={14} />
              <span>
                {f.cite.source}, {fmtDate(f.cite.date)}, {f.cite.scope === "parent" ? "parent company" : "this merchant"}
                {f.cite.stale ? ", stale" : ""}
              </span>
            </a>
          </li>
        ))}
      </ul>

      {r.disagreements.length > 0 && (
        <div className="mt-3 rounded-row bg-amber-tint px-3.5 py-3">
          <p className="caps text-micro text-ink-2">Sources disagree</p>
          {r.disagreements.map((d) => (
            <p key={d} className="mt-1 font-serif text-caption text-black">{d} We show both.</p>
          ))}
        </div>
      )}

      <div className="mt-4">
        <p className="caps text-micro text-ink-2">What we couldn&apos;t establish</p>
        {[...r.limits, ...r.unknowns].map((u) => (
          <p key={u} className="mt-1 font-serif text-caption text-ink-2">{u}</p>
        ))}
      </div>

      <div className="mt-4 rounded-row bg-white px-3.5 py-3">
        <p className="caps text-micro text-ink-2">Why this matters to you</p>
        <p className="mt-1 font-serif text-caption text-black">{r.whyItMatters}</p>
      </div>

      <p className="mt-2 font-serif text-micro text-ink-2">
        {r.grounding.ok
          ? `Citation check passed. Each claim is tied to a rating (${r.source === "live" ? "AI-written" : "built from the ratings"}).`
          : `Citation check removed ${r.grounding.dropped} claim${r.grounding.dropped === 1 ? "" : "s"} it couldn't trace to a rating.`}
      </p>
    </motion.section>
  );
}

export { ISSUE_WORD };
