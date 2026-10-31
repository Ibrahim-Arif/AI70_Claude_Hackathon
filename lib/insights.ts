/**
 * Deterministic building blocks for the company page and dashboard: what deserves a look,
 * how reliable the evidence is, and how the same facts read under different priorities.
 * No AI here. The AI explains these; it never produces them.
 */
import { hasDifferentParent, parentName } from "@/data/merchants";
import { evaluate, isStale, label, weightOf, type LabelResult } from "./engine";
import type { Label, Merchant, Preference, Profile } from "./types";
import { catalogById } from "./values";

export type FindingKind = "conflict" | "mixed" | "gap";
export type Finding = { merchantId: string; kind: FindingKind; label: Label; headline: string; detail: string; /** A few words, for scanning. */ short: string; spend: number };

function ratingFor(m: Merchant, p: Preference) {
  const rule = p.rule;
  return rule?.kind === "rating" ? m.ratings.find((r) => r.issue === rule.issue) : undefined;
}

/** One plain-language line per flagged merchant, built from the rules engine's own reasons. */
export function describeFinding(m: Merchant, result: LabelResult): { headline: string; detail: string; short: string } {
  const p = result.reasons[0];
  const owner = hasDifferentParent(m) ? ` Owned by ${parentName(m)}.` : "";
  if (!p) return { headline: "Worth a closer look", detail: owner.trim(), short: "Worth a look" };
  const r = ratingFor(m, p);
  if (result.label === "Unknown") {
    return { headline: `Not enough evidence on ${p.label.toLowerCase()}`, detail: `No reliable rating yet.${owner}`, short: `${p.label}: no rating` };
  }
  if (r) {
    return {
      headline: `${p.label}: rated ${r.score} out of 100`,
      detail: `${r.scope === "parent" ? "Describes the parent company." : "Describes this merchant."}${owner}`,
      short: `${p.label}: ${result.label === "Conflicts" ? "far below" : "below"}`,
    };
  }
  if (p.rule?.kind === "entity") return { headline: `Parent-company connection: ${parentName(m)}`, detail: `You chose "${p.label}".`, short: `Owned by ${parentName(m)}` };
  return { headline: `Matches "${p.label}"`, detail: `Based on its category.${owner}`, short: p.label };
}

/** Up to `limit` findings: conflicts first, then mixed, then evidence gaps; ordered by spend within each. */
export function topFindings(
  rows: { merchant: Merchant; spend: number; result: LabelResult }[],
  kept: string[],
  limit = 3,
): Finding[] {
  const visible = rows.filter((r) => !kept.includes(r.merchant.id));
  const make = (kind: FindingKind, l: Label) =>
    visible
      .filter((r) => r.result.label === l && (l !== "Unknown" || r.result.reasons.length > 0))
      .map((r) => ({ merchantId: r.merchant.id, kind, label: l, spend: r.spend, ...describeFinding(r.merchant, r.result) }));
  return [...make("conflict", "Conflicts"), ...make("mixed", "Mixed"), ...make("gap", "Unknown")].slice(0, limit);
}

export type Reliability = {
  level: "limited" | "some" | "broad";
  sources: number;
  newest: string | null;
  parentScoped: number;
  stale: number;
  notes: string[];
};

/** How much weight the evidence can bear. Counts and dates only; no judgment about the company. */
export function reliability(m: Merchant): Reliability {
  const rs = m.ratings;
  const sources = new Set(rs.map((r) => r.source)).size;
  const parentScoped = rs.filter((r) => r.scope === "parent").length;
  const stale = rs.filter((r) => isStale(r)).length;
  const newest = rs.map((r) => r.date).sort().at(-1) ?? null;
  const level = rs.length >= 5 && stale === 0 ? "broad" : rs.length >= 3 ? "some" : "limited";
  const notes: string[] = [];
  if (rs.length === 0) notes.push("No ratings yet.");
  if (parentScoped) notes.push(`${parentScoped} of ${rs.length} ratings describe the parent company, not necessarily this location.`);
  if (stale) notes.push(`${stale} ${stale === 1 ? "rating is" : "ratings are"} more than 18 months old.`);
  if (rs.length && rs.length < 5) notes.push(`Only ${rs.length} of 5 topics are rated.`);
  notes.push("Ratings summarize published assessments. They don't show conditions at every store or for every product.");
  return { level, sources, newest, parentScoped, stale, notes };
}

export type Lens = { id: string; name: string; blurb: string; profile: Profile };

const lensProfile = (name: string, emphasis: string, extra: string[] = []): Profile => ({
  name,
  maxPriceIncreasePct: 5,
  preferences: [
    { ...catalogById[emphasis].pref, importance: "dealbreaker" },
    ...extra.map((id) => ({ ...catalogById[id].pref, importance: "nice" as const })),
  ],
});

/** Same evidence, three different readings. The facts never change; only what matters does. */
export const LENSES: Lens[] = [
  { id: "climate", name: "Climate first", blurb: "Someone for whom climate is a dealbreaker", profile: lensProfile("Climate", "climate", ["labor", "political"]) },
  { id: "labor", name: "Workers first", blurb: "Someone for whom worker treatment is a dealbreaker", profile: lensProfile("Workers", "labor", ["climate", "political"]) },
  { id: "political", name: "Political spending first", blurb: "Someone for whom political spending is a dealbreaker", profile: lensProfile("Political", "political", ["climate", "labor"]) },
];

export function lensReadings(m: Merchant) {
  return LENSES.map((l) => ({ ...l, label: label(m, l.profile).label }));
}

/** For each of the person's values: what the evidence says and whether it clears their own bar. */
export function connections(m: Merchant, profile: Profile) {
  return profile.preferences
    .filter((p) => p.type !== "unsupported")
    .map((p) => {
      const r = ratingFor(m, p);
      const ev = evaluate(m, p);
      return { pref: p, weight: weightOf(p), rating: r, evaluation: ev };
    });
}
