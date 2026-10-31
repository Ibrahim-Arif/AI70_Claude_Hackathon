/**
 * Grounded evidence research. The model may only choose which rated issues to
 * discuss and how to phrase them; citations are attached by code from the
 * merchant's real ratings, and every number it writes is checked here.
 */
import { z } from "zod";
import { caveat, fmtDate, templateExplain } from "./explainTemplate";
import { ISSUES, type ExplainInput } from "./schemas";
import { PASS_SCORE, STALE_MONTHS } from "@/lib/engine";

export const ResearchOutputSchema = z.object({
  summary: z.string().min(10).max(500),
  findings: z.array(z.object({ issue: z.enum(ISSUES), text: z.string().min(5).max(280) })).max(6),
  whyItMatters: z.string().min(10).max(320).optional(),
  limits: z.array(z.string().min(5).max(200)).max(3).optional(),
});

export type Citation = { source: string; date: string; scope: "merchant" | "parent"; score: number; url: string; stale: boolean };
export type Finding = { issue: (typeof ISSUES)[number]; text: string; cite: Citation };
export type Research = {
  summary: string;
  findings: Finding[];
  /** Issues with no rating in our sources. Never shown as aligned. */
  unknowns: string[];
  /** Places where a parent-company rating and a merchant rating land on different sides of the pass mark. */
  disagreements: string[];
  caveat: string;
  /** Why this evidence connects to the person's own chosen values. AI-written, then verified. */
  whyItMatters: string;
  /** What the evidence does not establish. */
  limits: string[];
  grounding: { ok: boolean; dropped: number; problems: string[] };
  source: "live" | "template";
};

export const ISSUE_WORD: Record<string, string> = {
  climate: "climate",
  labor: "worker treatment",
  governance: "governance",
  political: "political spending",
  privacy: "privacy",
};

const BANNED_TONE = /\b(bad|harm|harmful|guilty|guilt|shame|shameful)\b/i;
const FUNDING = /\b(fund|funds|funded|funding|bankroll\w*|your money (directly )?(supports|goes|pays))\b/i;

type Rated = ExplainInput["ratings"][number];

function monthsOld(d: string, today = "2026-10") {
  const [ty, tm] = today.split("-").map(Number);
  const [y, m] = d.split("-").map(Number);
  return (ty - y) * 12 + (tm - m);
}

const cite = (r: Rated): Citation => ({
  source: r.source,
  date: r.date,
  scope: r.scope,
  score: r.score,
  url: r.url,
  stale: monthsOld(r.date) > STALE_MONTHS,
});

/** Deterministic facts: unknowns and cross-source disagreements. Never model-written. */
export function researchFacts(input: ExplainInput) {
  const rated = new Set(input.ratings.map((r) => r.issue));
  const unknowns = ISSUES.filter((i) => !rated.has(i)).map((i) => `No rating for ${ISSUE_WORD[i]} in our sources.`);
  const disagreements: string[] = [];
  for (const issue of ISSUES) {
    const rs = input.ratings.filter((r) => r.issue === issue);
    const hasPass = rs.some((r) => r.score >= PASS_SCORE);
    const hasFail = rs.some((r) => r.score < PASS_SCORE);
    if (rs.length > 1 && hasPass && hasFail) {
      disagreements.push(`Sources disagree on ${ISSUE_WORD[issue]}: ${rs.map((r) => `${r.source} ${r.score}`).join(" vs ")}.`);
    }
  }
  return { unknowns, disagreements };
}

function templateFinding(r: Rated): Finding {
  const stale = monthsOld(r.date) > STALE_MONTHS ? " This rating is more than 18 months old." : "";
  const scope = r.scope === "parent" ? " It describes the parent company." : "";
  return {
    issue: r.issue,
    text: `${ISSUE_WORD[r.issue][0].toUpperCase()}${ISSUE_WORD[r.issue].slice(1)} scored ${r.score} out of 100 in the ${r.source} (${fmtDate(r.date)}).${scope}${stale}`,
    cite: cite(r),
  };
}

export function templateWhy(input: ExplainInput): string {
  const reason = input.reasons[0];
  const rule = reason?.rule as { kind?: string; issue?: string } | undefined;
  const r = rule?.kind === "rating" ? input.ratings.find((x) => x.issue === rule.issue) : undefined;
  if (reason && r) {
    return `You marked ${reason.label.toLowerCase()} as ${reason.importance === "dealbreaker" ? "a dealbreaker" : reason.importance === "nice" ? "nice to have" : "important"}. The ${r.source} (${fmtDate(r.date)}) scored it ${r.score} out of 100, which is below the bar you set.`;
  }
  if (reason) return `You chose "${reason.label}", and this company's category or ownership connects to it.`;
  return "This company meets the values you set, based on the ratings we have. That doesn't mean there's nothing else to know.";
}

export function templateLimits(input: ExplainInput): string[] {
  return [caveat(input), "Ratings summarize published assessments. They don't show conditions at every store or for every product."];
}

export function templateResearch(input: ExplainInput, problems: string[] = [], dropped = 0): Research {
  const facts = researchFacts(input);
  return {
    summary: templateExplain(input),
    findings: input.ratings.map(templateFinding),
    ...facts,
    caveat: caveat(input),
    whyItMatters: templateWhy(input),
    limits: templateLimits(input),
    grounding: { ok: problems.length === 0, dropped, problems },
    source: "template",
  };
}

function allowedNumbers(ratings: Rated[]) {
  const ok = new Set<number>([100, 50, 30, 18]);
  for (const r of ratings) {
    ok.add(r.score);
    ok.add(Number(r.date.split("-")[0]));
  }
  return ok;
}

/** Numbers in text that do not trace back to a real rating. */
export function unsupportedNumbers(text: string, allowed: Set<number>): number[] {
  const nums = (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  return nums.filter((n) => !allowed.has(n));
}

/**
 * The model never certifies its own grounding. Anything it writes that cannot be
 * traced to a real rating is dropped; if nothing survives, we use the template.
 */
export function verifyResearch(raw: unknown, input: ExplainInput): Research {
  const parsed = ResearchOutputSchema.safeParse(raw);
  if (!parsed.success) return templateResearch(input, ["Model output did not match the expected shape."]);

  const problems: string[] = [];
  const allowed = allowedNumbers(input.ratings);
  const byIssue = new Map(input.ratings.map((r) => [r.issue, r]));
  const seen = new Set<string>();
  const findings: Finding[] = [];
  let dropped = 0;

  const bad = (text: string): string | null => {
    if (text.includes("—")) return "used an em dash";
    if (BANNED_TONE.test(text)) return "used judgmental wording";
    if (FUNDING.test(text)) return "implied the purchase funds an activity";
    const extra = unsupportedNumbers(text, allowed);
    if (extra.length) return `stated number(s) not in the ratings (${extra.join(", ")})`;
    return null;
  };

  for (const f of parsed.data.findings) {
    const r = byIssue.get(f.issue);
    if (!r) {
      dropped++;
      problems.push(`Dropped a ${ISSUE_WORD[f.issue]} claim: we have no rating for it.`);
      continue;
    }
    if (seen.has(f.issue)) {
      dropped++;
      continue;
    }
    const why = bad(f.text);
    if (why) {
      dropped++;
      problems.push(`Dropped a ${ISSUE_WORD[f.issue]} claim: it ${why}.`);
      continue;
    }
    seen.add(f.issue);
    findings.push({ issue: f.issue, text: f.text, cite: cite(r) });
  }

  if (findings.length === 0) return templateResearch(input, problems, dropped);

  let summary = parsed.data.summary;
  const summaryWhy = bad(summary);
  if (summaryWhy) {
    problems.push(`Replaced the summary: it ${summaryWhy}.`);
    summary = templateExplain(input);
  }

  // Issues we have ratings for but the model skipped are still shown, in template form.
  for (const r of input.ratings) if (!seen.has(r.issue)) findings.push(templateFinding(r));

  let whyItMatters = parsed.data.whyItMatters ?? templateWhy(input);
  const whyBad = bad(whyItMatters);
  if (whyBad) {
    problems.push(`Replaced the "why it matters" note: it ${whyBad}.`);
    whyItMatters = templateWhy(input);
  }
  const limits = (parsed.data.limits ?? []).filter((l) => !bad(l));
  const finalLimits = limits.length ? limits : templateLimits(input);

  return {
    summary,
    findings,
    ...researchFacts(input),
    caveat: caveat(input),
    whyItMatters,
    limits: finalLimits,
    grounding: { ok: problems.length === 0, dropped, problems },
    source: "live",
  };
}
