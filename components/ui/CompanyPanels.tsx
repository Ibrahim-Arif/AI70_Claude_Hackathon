"use client";

import { useState } from "react";
import { SecondaryButton } from "./Buttons";
import { Check } from "./icons";
import { StatusShape } from "./Status";
import { formatRatingDate, PASS_SCORE, reasonText, type LabelResult } from "@/lib/engine";
import { connections, lensReadings, reliability } from "@/lib/insights";
import type { Alternative, Merchant, Profile } from "@/lib/types";

const IMP = (w: number) => (w < 30 ? "Nice to have" : w >= 90 ? "Dealbreaker" : "Important");

export function SectionHead({ n, title }: { n: number; title: string }) {
  return (
    <h3 className="caps mt-8 flex items-center gap-2.5 text-label text-black">
      <span className="num flex h-6 w-6 items-center justify-center rounded-tile bg-royal text-micro text-white">{n}</span>
      {title}
    </h3>
  );
}

const LEVEL_WORD = { limited: "Limited evidence", some: "Some evidence", broad: "Broad evidence" } as const;

/** How much weight the evidence can bear. Counts and dates only. */
export function ReliabilityPanel({ m }: { m: Merchant }) {
  const r = reliability(m);
  return (
    <div className="mt-3 rounded-row bg-fill px-4 py-3">
      <p className="flex items-center justify-between">
        <span className="caps text-micro text-ink-2">{LEVEL_WORD[r.level]}</span>
        {r.newest && <span className="font-serif text-micro text-ink-2">Newest: {formatRatingDate(r.newest)}</span>}
      </p>
      <ul className="mt-2 list-disc pl-5 font-serif text-caption text-black">
        {r.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}

/** "Why am I seeing this?" Each of the person's values against the evidence, plus other readings of the same facts. */
export function WhyPanel({ m, profile, result }: { m: Merchant; profile: Profile; result: LabelResult }) {
  const [lenses, setLenses] = useState(false);
  const conns = connections(m, profile);
  const reason = reasonText(result);
  return (
    <div className="mt-3">
      {reason && <p className="font-serif text-body text-black">{reason}</p>}
      {conns.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {conns.map(({ pref, weight, rating, evaluation }) => (
            <li key={pref.id} className="flex items-center gap-3 rounded-row bg-white px-3.5 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                {evaluation === "pass" ? <Check size={18} strokeWidth={2.6} className="text-royal" /> : <StatusShape label={evaluation === "fail" ? "Mixed" : "Unknown"} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="caps block truncate text-label text-black">{pref.label}</span>
                <span className="block font-serif text-micro text-ink-2">
                  {IMP(weight)} to you ·{" "}
                  {rating
                    ? `rated ${rating.score}/100, ${rating.score >= PASS_SCORE ? "meets" : "below"} the bar`
                    : evaluation === "unknown"
                      ? "no rating yet"
                      : evaluation === "pass"
                        ? "meets this"
                        : evaluation === "fail"
                          ? "doesn't match"
                          : "not applicable here"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setLenses((v) => !v)}
        aria-expanded={lenses}
        className="mt-3 min-h-11 font-serif text-caption italic text-royal underline underline-offset-4"
      >
        {lenses ? "Hide other perspectives" : "See how this reads for someone with different priorities"}
      </button>
      {lenses && (
        <div className="rounded-row bg-royal-tint px-4 py-3">
          <p className="font-serif text-caption text-ink-2">Same evidence, different priorities. The facts don&apos;t change, only what matters.</p>
          <ul className="mt-2">
            {lensReadings(m).map((l) => (
              <li key={l.id} className="flex min-h-11 items-center justify-between gap-3 border-t border-white/70">
                <span className="font-serif text-caption text-black">{l.name}</span>
                <span className="flex items-center gap-1.5 font-serif text-caption text-black">
                  <StatusShape label={l.label} /> {l.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** Current choice next to one alternative, on the person's own priorities, price and evidence depth. */
export function AlternativeCompare({
  m,
  alt,
  spend,
  profile,
  onKeep,
  onExplore,
}: {
  m: Merchant;
  alt: Alternative;
  spend: number;
  profile: Profile;
  onKeep: () => void;
  onExplore: () => void;
}) {
  const [more, setMore] = useState(false);
  const priced = Math.round(spend * (1 + alt.priceDeltaPct / 100) * 100) / 100;
  const rows = profile.preferences.filter((p) => p.rule?.kind === "rating");
  const score = (rs: Merchant["ratings"], p: (typeof rows)[number]) => {
    const rule = p.rule;
    return rule?.kind === "rating" ? rs.find((r) => r.issue === rule.issue)?.score : undefined;
  };
  const cell = (s?: number) => (s === undefined ? "No rating" : `${s}/100`);
  return (
    <div className="mt-3 rounded-row bg-white px-4 py-4">
      <div className="grid grid-cols-[1.1fr_1fr_1fr] gap-x-2 gap-y-2 font-serif text-caption">
        <span />
        <span className="caps truncate text-micro text-ink-2">{m.name}</span>
        <span className="caps truncate text-micro text-ink-2">{alt.name}</span>

        <span className="text-ink-2">Monthly cost</span>
        <span className="num text-black">{money(spend)}</span>
        <span className="num text-black">{money(priced)}</span>

        {rows.map((p) => (
          <div key={p.id} className="contents">
            <span className="text-ink-2">{p.label}</span>
            <span className="text-black">{cell(score(m.ratings, p))}</span>
            <span className="text-black">{cell(score(alt.ratings, p))}</span>
          </div>
        ))}

        <span className="text-ink-2">Evidence depth</span>
        <span className="text-black">{m.ratings.length} of 5 topics</span>
        <span className="text-black">{alt.ratings.length} of 5 topics</span>
      </div>
      <p className="mt-3 font-serif text-micro text-ink-2">
        Prices and the alternative are illustrative. A switch can mean a trade: {alt.priceDeltaPct > 0 ? `about ${alt.priceDeltaPct}% more` : alt.priceDeltaPct < 0 ? `about ${Math.abs(alt.priceDeltaPct)}% less` : "about the same cost"}, {alt.availability} availability.
      </p>
      {more && (
        <ul className="mt-3 border-t border-hairline pt-2">
          {alt.ratings.map((r) => (
            <li key={r.issue} className="py-1 font-serif text-micro text-ink-2">
              {r.issue}: {r.score}/100 · {r.source}, {formatRatingDate(r.date)}
            </li>
          ))}
        </ul>
      )}
      <p className="caps mb-2 mt-4 text-micro text-ink-2">What would you like to do?</p>
      <div className="flex flex-col gap-2">
        <SecondaryButton onClick={onExplore}>Explore the alternative</SecondaryButton>
        <SecondaryButton onClick={() => setMore((v) => !v)}>{more ? "Hide the evidence" : "See more evidence"}</SecondaryButton>
        <SecondaryButton onClick={onKeep}>Keep my current choice</SecondaryButton>
      </div>
    </div>
  );
}
