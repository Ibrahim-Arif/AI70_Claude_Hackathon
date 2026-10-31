"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AISummary } from "../ui/AISummary";
import { EvidenceTrail } from "../ui/EvidenceTrail";
import { TradeoffCard } from "../ui/TradeoffCard";
import { AlternativeCompare, ReliabilityPanel, SectionHead, WhyPanel } from "../ui/CompanyPanels";
import { LinkButton, SecondaryButton } from "../ui/Buttons";
import { money2 } from "../ui/CountUp";
import { Check, ExternalLink } from "../ui/icons";
import { Monogram } from "../ui/MerchantRow";
import { LABEL_TINT, StatusMarker, StatusPill } from "../ui/Status";
import { SHEET_SPRING } from "../ui/BottomSheet";
import { alternatives } from "@/data/alternatives";
import { transactions } from "@/data/transactions";
import { hasDifferentParent, merchantById, parentName } from "@/data/merchants";
import { getCachedExplanation, getExplanation, MIN_PROCESSING_MS, wait } from "@/lib/ai/client";
import { UNKNOWN_EXPLANATION } from "@/lib/ai/scripted";
import { alternativesFor, formatRatingDate, genericSummary, isStale, profileHash } from "@/lib/engine";
import { useApp, useUI } from "@/lib/store";
import type { Issue, Rating } from "@/lib/types";
import { useDerived } from "@/lib/useDerived";
import { isPreferRule } from "@/lib/values";

const ISSUE_LABEL: Record<Issue, string> = {
  climate: "Climate",
  labor: "Labor",
  governance: "Governance",
  political: "Political",
  privacy: "Privacy",
};

function EvidenceRow({ r }: { r: Rating }) {
  const stale = isStale(r);
  return (
    <li className="flex items-start gap-3 border-b border-hairline py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="caps text-label text-black">{ISSUE_LABEL[r.issue]}</span>
          {stale && <span className="caps rounded-pill bg-fill px-2 py-0.5 text-micro text-ink-2">Stale</span>}
        </div>
        <p className="mt-1 font-serif text-caption text-ink-2">
          {r.source} · {formatRatingDate(r.date)} · {r.scope === "parent" ? "Parent company" : "Merchant"}
        </p>
      </div>
      <div className="flex w-[84px] shrink-0 flex-col items-end gap-1.5 pt-0.5">
        <span className="num text-label text-black">{r.score}/100</span>
        <span className="h-1.5 w-full overflow-hidden rounded-full bg-fill" aria-hidden>
          <motion.span
            className="block h-full rounded-full"
            style={{ backgroundColor: r.score < 30 ? "#E05A2B" : r.score < 50 ? "#F2C12E" : "#1D3BC4" }}
            initial={{ width: 0 }}
            animate={{ width: `${r.score}%` }}
            transition={{ type: "spring", stiffness: 160, damping: 26, delay: 0.15 }}
          />
        </span>
      </div>
      <a
        href={r.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${r.source} source`}
        className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center text-ink-2"
      >
        <ExternalLink size={18} />
      </a>
    </li>
  );
}

function useExplanation(id: string, enabled: boolean) {
  const d = useDerived();
  const aiMode = useApp((s) => s.aiMode);
  const m = merchantById[id];
  const result = d.results[id];
  const reqKey = `${aiMode}:${id}:${profileHash(d.profile)}`;
  const [state, setState] = useState<{ key: string; text: string } | null>(null);
  useEffect(() => {
    if (!enabled || !m) return;
    let alive = true;
    const cached = getCachedExplanation(m, d.profile, aiMode);
    const start = Date.now();
    getExplanation(m, result, d.profile, aiMode).then(async (t) => {
      const min = cached ? 500 : MIN_PROCESSING_MS;
      await wait(Math.max(0, min - (Date.now() - start)));
      if (alive) setState({ key: reqKey, text: t });
    });
    return () => {
      alive = false;
    };
  }, [reqKey, enabled, m, result, d.profile, aiMode]);
  if (!enabled) return UNKNOWN_EXPLANATION;
  return state?.key === reqKey ? state.text : null;
}

export function MerchantSheet({ id }: { id: string }) {
  const router = useRouter();
  const d = useDerived();
  const keep = useApp((s) => s.keep);
  const markEssential = useApp((s) => s.markEssential);
  const essential = useApp((s) => s.essential);
  const kept = useApp((s) => s.kept);
  const { closeSheet, openSheet, showToast } = useUI();
  const [showAlts, setShowAlts] = useState(false);
  const [selAlt, setSelAlt] = useState<string | null>(null);
  const [explore, setExplore] = useState(false);

  const m = merchantById[id];
  const result = d.results[id];
  const spend = d.spend[id] ?? 0;
  const generic = d.generic;
  const unknown = !generic && result.label === "Unknown";
  const unrated = m.ratings.length === 0;
  const flagged = !generic && (result.label === "Mixed" || result.label === "Conflicts");
  const supportsLocal = !generic && result.supports.some(isPreferRule);
  const explanation = useExplanation(id, !generic && !unknown && !unrated);
  const alts = alternativesFor(id, alternatives, d.profile);
  const isKept = kept.includes(id);
  const isEssential = essential.includes(id);
  const descriptor = transactions.find((t) => t.merchantId === id)?.rawName;
  const hasParentScope = m.ratings.some((r) => r.scope === "parent");

  const onKeep = () => {
    keep(id);
    closeSheet();
    showToast(
      unknown || unrated ? `Got it. We'll leave ${m.name} as is.` : `Got it. We won't flag ${m.name} again.`,
      { label: "View", href: "/spending" },
    );
  };

  const onEssential = () => {
    markEssential(id);
    closeSheet();
    showToast(`Got it. ${m.name} is marked as essential.`, { label: "View", href: "/spending" });
  };

  return (
    <div className="pt-1">
      <header
        className="-mx-6 -mt-1 flex items-center gap-3.5 px-6 py-4"
        style={{ backgroundColor: generic ? "#EDEBE7" : LABEL_TINT[result.label] }}
      >
        <span className="rounded-full bg-white p-1">
          <Monogram name={m.name} size={48} label={generic ? undefined : result.label} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="caps text-row text-black">{m.name}</h2>
          {hasDifferentParent(m) && <p className="font-serif text-caption text-ink-2">Owned by {parentName(m)}</p>}
        </div>
        {generic ? <StatusPill white generic={genericSummary(m)} /> : <StatusPill white label={result.label} />}
      </header>

      <SectionHead n={1} title="The company" />
      <p className="mt-3 font-serif text-body text-black">You spent {money2(spend)} this month.</p>
      <div className="mt-3 rounded-row bg-fill px-4 py-3">
        <p className="caps text-micro text-ink-2">Company behind this purchase</p>
        <p className="mt-1 font-serif text-caption text-black">
          {m.name}
          {hasDifferentParent(m) ? `, owned by ${parentName(m)}` : ""}
          {descriptor ? <span className="text-ink-2">. Matched from “{descriptor}” on your statement.</span> : null}
        </p>
        {hasParentScope && (
          <p className="mt-1 font-serif text-micro text-ink-2">
            Some evidence below describes the parent company, not necessarily this store.
          </p>
        )}
      </div>
      {supportsLocal && (
        <p className="mt-2 flex items-center gap-1.5 font-serif text-body text-ink-2">
          <Check size={18} strokeWidth={2.4} className="text-royal" /> Supports local, a value you chose.
        </p>
      )}
      {isKept && (
        <p className="mt-2 font-serif text-caption text-ink-2">
          {isEssential ? "You marked this as essential." : "You chose to keep this one."} It won&apos;t be flagged.
        </p>
      )}

      {unrated || unknown ? (
        <>
          <SectionHead n={2} title="What we found" />
          {unrated && <p className="mt-3 font-serif text-body text-ink-2">No reliable rating yet.</p>}
          {!unrated && (
            <ul className="mt-4">
              {m.ratings.map((r) => (
                <EvidenceRow key={r.issue} r={r} />
              ))}
            </ul>
          )}
          <div className="mt-5">
            <AISummary text={UNKNOWN_EXPLANATION} loading={false} label="What we know" />
          </div>
        </>
      ) : (
        <>
          <SectionHead n={2} title="What we found" />
          <ul className="mt-1">
            {m.ratings.map((r) => (
              <EvidenceRow key={r.issue} r={r} />
            ))}
          </ul>
          {!generic &&
            result.notes.map((n) => {
              const issue = n.rule?.kind === "rating" ? n.rule.issue : null;
              const r = issue ? m.ratings.find((x) => x.issue === issue) : null;
              return (
                <p key={n.id} className="mt-2 font-serif text-caption text-ink-3">
                  {n.label} falls short{r ? ` at ${r.score}` : ""}. You marked it nice to have, so it doesn&apos;t change the label.
                </p>
              );
            })}
          {!generic && (
            <div className="mt-5">
              <AISummary text={explanation} loading={!explanation} />
              <div className="mt-3">
                <EvidenceTrail merchantId={id} result={result} profile={d.profile} />
              </div>
            </div>
          )}
          {generic && (
            <p className="mt-5 font-serif text-body text-ink-2">Set your values to see how this company matches what you care about.</p>
          )}
        </>
      )}

      {!generic && (
        <>
          <SectionHead n={3} title="How reliable is it?" />
          <ReliabilityPanel m={m} />
          <SectionHead n={4} title="Why you might care" />
          <WhyPanel m={m} profile={d.profile} result={result} />
        </>
      )}

      {!generic && <SectionHead n={5} title="Your options" />}
      <div className="mt-4 flex flex-col gap-3">
        {flagged && !isKept && (
          <p className="font-serif text-caption text-ink-2">
            Tally spotted a possible mismatch with what you told us. It can&apos;t say whether this purchase was right. That&apos;s your call.
          </p>
        )}
        {flagged && (
          <SecondaryButton onClick={() => setShowAlts((v) => !v)} aria-expanded={showAlts}>
            Find alternatives
          </SecondaryButton>
        )}
        {(flagged || unknown || unrated) && !isKept && (
          <SecondaryButton onClick={onKeep}>
            {flagged ? "Keep it, I've decided" : "Keep it"}
          </SecondaryButton>
        )}
        {flagged && !isKept && <SecondaryButton onClick={onEssential}>Mark as essential</SecondaryButton>}
        {flagged && (
          <SecondaryButton onClick={() => openSheet({ type: "goal", merchantId: id })}>Set a goal</SecondaryButton>
        )}
      </div>

      <AnimatePresence initial={false}>
        {showAlts && flagged && (
          <motion.section
            key="alts"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SHEET_SPRING}
            className="overflow-hidden"
          >
            <div className="pt-6">
              <p className="caps text-label text-ink-2">Options within +{d.profile.maxPriceIncreasePct}%</p>
              {alts.fits.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-3">
                  {alts.fits.map((a) => (
                    <li key={a.name}>
                      <button
                        type="button"
                        onClick={() => setSelAlt(selAlt === a.name ? null : a.name)}
                        aria-expanded={selAlt === a.name}
                        className={`flex min-h-[76px] w-full items-center gap-3.5 rounded-row bg-royal-tint px-4 py-3 text-left ${selAlt === a.name ? "ring-2 ring-royal" : ""}`}
                      >
                        <span className="rounded-full bg-white p-0.5">
                          <Monogram name={a.name} label="Aligned" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="caps truncate text-label text-black">{a.name}</p>
                          <p className="font-serif text-caption text-ink-2">
                            {a.availability[0].toUpperCase() + a.availability.slice(1)} ·{" "}
                            {a.priceDeltaPct > 0 ? `+${a.priceDeltaPct}% price` : `${a.priceDeltaPct}% price`}
                          </p>
                        </div>
                        <StatusMarker label="Aligned" />
                      </button>
                      {selAlt === a.name && (
                        <AlternativeCompare m={m} alt={a} spend={spend} profile={d.profile} onKeep={onKeep} onExplore={() => setExplore(true)} />
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 font-serif text-body text-ink-2">No alternative fits your budget and values yet.</p>
              )}
              {alts.overBudgetCount > 0 && (
                <p className="mt-3 font-serif text-caption text-ink-2">
                  {alts.overBudgetCount} more {alts.overBudgetCount === 1 ? "option is" : "options are"} over your budget.
                </p>
              )}
              <div className="mt-4">
                {explore ? (
                  <TradeoffCard key="auto" autoRun merchantId={id} monthlySpend={spend} profile={d.profile} />
                ) : (
                  <TradeoffCard key="idle" merchantId={id} monthlySpend={spend} profile={d.profile} />
                )}
              </div>
              <p className="mt-2 font-serif text-caption text-ink-2">Alternatives are fictional and illustrative.</p>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {!generic && !unknown && !unrated && !flagged && (
        <div className="mt-4 flex justify-center">
          <LinkButton onClick={() => openSheet({ type: "goal", merchantId: id })}>Set a goal</LinkButton>
        </div>
      )}
      {generic && (
        <div className="mt-4 flex justify-center">
          <LinkButton
            onClick={() => {
              closeSheet();
              router.push("/you");
            }}
          >
            Set your values
          </LinkButton>
        </div>
      )}
      <p className="mt-2 text-center font-serif text-caption text-ink-2">Ratings are illustrative demo data.</p>
    </div>
  );
}
