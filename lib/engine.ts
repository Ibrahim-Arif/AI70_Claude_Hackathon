/**
 * Tally rules engine. Pure, deterministic functions. No AI ever computes
 * labels, totals or ratings: everything the UI shows as a verdict comes from here.
 */
import type {
  Alternative,
  Evaluation,
  GenericSummary,
  Label,
  Merchant,
  Preference,
  Profile,
  Rating,
  Transaction,
} from "./types";
import { IMPORTANCE_WORD } from "./values";

export const PASS_SCORE = 50;
/** Below this, a rating "falls far short": Conflicts even when the value is only Important. */
export const FAR_SCORE = 30;
export const STALE_MONTHS = 18;

// ---------------------------------------------------------------- evaluate

export function evaluate(merchant: Merchant, pref: Preference): Evaluation {
  const rule = pref.rule;
  if (pref.type === "unsupported" || !rule) return "na";
  switch (rule.kind) {
    case "rating": {
      const rating = merchant.ratings.find((r) => r.issue === rule.issue);
      if (!rating) return "unknown";
      return rating.score < PASS_SCORE ? "fail" : "pass";
    }
    case "attribute": {
      const tags = [rule.tag, ...(rule.alsoTags ?? [])];
      const has = merchant.tags.some((t) => tags.includes(t));
      if (rule.polarity === "avoid") return has ? "fail" : "pass";
      // prefer-rules never fail
      return has ? "pass" : "na";
    }
    case "entity":
      return merchant.parentId === rule.parentId ? "fail" : "pass";
  }
}

/** True when a rating-rule fail is far below the bar (score < FAR_SCORE). */
export function isFarBelow(merchant: Merchant, pref: Preference): boolean {
  const rule = pref.rule;
  if (rule?.kind !== "rating") return false;
  const r = merchant.ratings.find((x) => x.issue === rule.issue);
  return !!r && r.score < FAR_SCORE;
}

// ---------------------------------------------------------------- label

export type LabelResult = {
  label: Label;
  /** preferences that caused the label */
  reasons: Preference[];
  /** nice-to-have preferences that fell short (note only, label unchanged) */
  notes: Preference[];
  /** prefer-rules this merchant satisfies ("supports your value") */
  supports: Preference[];
  /** Important values that fell far short (score < 30), which raise the label to Conflicts */
  severe: Preference[];
};

export function label(merchant: Merchant | undefined, profile: Profile): LabelResult {
  if (!merchant) return { label: "Unknown", reasons: [], notes: [], supports: [], severe: [] };

  const evals = profile.preferences.map((p) => ({ p, e: evaluate(merchant, p) }));
  const notes = evals.filter((x) => x.p.importance === "nice" && x.e === "fail").map((x) => x.p);
  const supports = evals
    .filter((x) => x.e === "pass" && x.p.rule?.kind === "attribute" && x.p.rule.polarity === "prefer")
    .map((x) => x.p);

  // 1. Any fail on a Dealbreaker, or a far-below fail on an Important value → Conflicts
  const dealFails = evals.filter((x) => x.p.importance === "dealbreaker" && x.e === "fail").map((x) => x.p);
  const severe = evals
    .filter((x) => x.p.importance === "important" && x.e === "fail" && isFarBelow(merchant, x.p))
    .map((x) => x.p);
  if (dealFails.length || severe.length) {
    return { label: "Conflicts", reasons: [...dealFails, ...severe], notes, supports, severe };
  }

  // 2. Any unknown on an Important or Dealbreaker → Unknown
  const unknowns = evals.filter((x) => x.p.importance !== "nice" && x.e === "unknown");
  if (unknowns.length) return { label: "Unknown", reasons: unknowns.map((x) => x.p), notes, supports, severe };

  // 3. Any fail on an Important → Mixed
  const importantFails = evals.filter((x) => x.p.importance === "important" && x.e === "fail");
  if (importantFails.length) {
    return { label: "Mixed", reasons: importantFails.map((x) => x.p), notes, supports, severe };
  }

  return { label: "Aligned", reasons: [], notes, supports, severe };
}

/** Human sentence for the reasons line. */
export function reasonText(result: LabelResult): string | null {
  if (result.label === "Aligned" || result.reasons.length === 0) return null;
  const names = result.reasons.map((p) => p.label);
  const list =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  if (result.label === "Unknown") {
    return `No reliable rating yet for ${list}, which you marked as ${IMPORTANCE_WORD[result.reasons[0].importance]}.`;
  }
  const join = (ps: Preference[]) => {
    const n = ps.map((p) => p.label);
    return n.length === 1 ? n[0] : `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
  };
  const deal = result.reasons.filter((p) => p.importance === "dealbreaker");
  const severe = result.severe;
  if (result.label === "Conflicts") {
    const parts: string[] = [];
    if (deal.length) parts.push(`Flagged because you marked ${join(deal)} as a dealbreaker.`);
    if (severe.length) {
      parts.push(
        deal.length
          ? `It also falls far short on ${join(severe)}.`
          : `Flagged because it falls far short on ${join(severe)}, which you marked as important.`,
      );
    }
    return parts.join(" ");
  }
  return `Flagged because you marked ${list} as ${IMPORTANCE_WORD[result.reasons[0].importance]}.`;
}

// ---------------------------------------------------------------- generic mode

export function genericSummary(merchant: Merchant | undefined): GenericSummary {
  if (!merchant || merchant.ratings.length === 0) return "Unrated";
  if (merchant.ratings.some((r) => r.score < 40)) return "Weak";
  if (merchant.ratings.every((r) => r.score >= 60)) return "Strong";
  return "Mixed";
}

// ---------------------------------------------------------------- spend + summary

export function spendByMerchant(txs: Transaction[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of txs) {
    if (t.excluded) continue;
    const key = t.merchantId ?? `unmapped:${t.rawName}`;
    out[key] = round2((out[key] ?? 0) + t.amount);
  }
  return out;
}

export type Summary = {
  total: number;
  aligned: number;
  mixed: number;
  conflicts: number;
  unknown: number;
  labeled: number;
  /** null when coverage is under 20% */
  alignmentPct: number | null;
  coveragePct: number;
  enoughData: boolean;
  labels: Record<string, Label>;
};

export function summarize(
  txs: Transaction[],
  merchantsById: Record<string, Merchant>,
  profile: Profile,
): Summary {
  const spend = spendByMerchant(txs);
  let aligned = 0,
    mixed = 0,
    conflicts = 0,
    unknown = 0;
  const labels: Record<string, Label> = {};
  for (const [id, amount] of Object.entries(spend)) {
    const l = label(merchantsById[id], profile).label;
    labels[id] = l;
    if (l === "Aligned") aligned += amount;
    else if (l === "Mixed") mixed += amount;
    else if (l === "Conflicts") conflicts += amount;
    else unknown += amount;
  }
  aligned = round2(aligned);
  mixed = round2(mixed);
  conflicts = round2(conflicts);
  unknown = round2(unknown);
  const labeled = round2(aligned + mixed + conflicts);
  const total = round2(labeled + unknown);
  const coveragePct = total > 0 ? Math.round((labeled / total) * 100) : 0;
  const enoughData = coveragePct >= 20 && labeled > 0;
  return {
    total,
    aligned,
    mixed,
    conflicts,
    unknown,
    labeled,
    alignmentPct: enoughData ? Math.round((aligned / labeled) * 100) : null,
    coveragePct,
    enoughData,
    labels,
  };
}

/** Generic mode: share of spend at merchants that have any ratings. */
export function ratedCoverage(txs: Transaction[], merchantsById: Record<string, Merchant>) {
  const spend = spendByMerchant(txs);
  let rated = 0,
    total = 0;
  for (const [id, amount] of Object.entries(spend)) {
    total += amount;
    if ((merchantsById[id]?.ratings.length ?? 0) > 0) rated += amount;
  }
  return {
    rated: round2(rated),
    unrated: round2(total - rated),
    total: round2(total),
    coveragePct: total > 0 ? Math.round((rated / total) * 100) : 0,
  };
}

// ---------------------------------------------------------------- flags

export function flags(
  txs: Transaction[],
  merchantsById: Record<string, Merchant>,
  profile: Profile,
  kept: string[] = [],
): string[] {
  const spend = spendByMerchant(txs);
  const rows = Object.entries(spend)
    .map(([id, amount]) => ({ id, amount, l: label(merchantsById[id], profile).label }))
    .filter((r) => !kept.includes(r.id));
  const byDesc = (a: { amount: number }, b: { amount: number }) => b.amount - a.amount;
  return [
    ...rows.filter((r) => r.l === "Conflicts").sort(byDesc),
    ...rows.filter((r) => r.l === "Mixed").sort(byDesc),
  ].map((r) => r.id);
}

/** Merchant ids whose label differs between two profiles. */
export function changedMerchants(
  txs: Transaction[],
  merchantsById: Record<string, Merchant>,
  before: Profile,
  after: Profile,
): string[] {
  const ids = Object.keys(spendByMerchant(txs));
  return ids.filter(
    (id) => label(merchantsById[id], before).label !== label(merchantsById[id], after).label,
  );
}

// ---------------------------------------------------------------- alternatives

export function alternativeAsMerchant(a: Alternative): Merchant {
  const slug = a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return { id: `alt-${slug}`, name: a.name, parentId: `alt-${slug}`, category: "", tags: a.tags, ratings: a.ratings };
}

export function alternativesFor(merchantId: string, all: Alternative[], profile: Profile) {
  const forThis = all.filter((a) => a.forMerchantId === merchantId);
  const overBudget = forThis.filter((a) => a.priceDeltaPct > profile.maxPriceIncreasePct);
  const fits = forThis.filter(
    (a) =>
      a.priceDeltaPct <= profile.maxPriceIncreasePct &&
      label(alternativeAsMerchant(a), profile).label === "Aligned",
  );
  return { fits, overBudgetCount: overBudget.length };
}

// ---------------------------------------------------------------- evidence helpers

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatRatingDate(date: string): string {
  const [y, m] = date.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${y}`;
}

export function isStale(rating: Rating, today = "2026-10-30"): boolean {
  const [ty, tm] = today.split("-").map(Number);
  const [y, m] = rating.date.split("-").map(Number);
  const months = (ty - y) * 12 + (tm - m);
  return months > STALE_MONTHS;
}

export function sameParentMerchants(merchant: Merchant, all: Merchant[]): Merchant[] {
  return all.filter((m) => m.parentId === merchant.parentId);
}

/** Small stable hash of everything that changes labels. */
export function profileHash(profile: Profile): string {
  const s = JSON.stringify([
    profile.maxPriceIncreasePct,
    profile.preferences.map((p) => [p.id, p.rule, p.importance]),
  ]);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}
