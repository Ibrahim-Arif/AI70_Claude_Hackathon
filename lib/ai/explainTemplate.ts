import type { ExplainInput } from "./schemas";
import { UNKNOWN_EXPLANATION } from "./scripted";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDate(d: string) {
  const [y, m] = d.split("-").map(Number);
  return `${MONTHS[(m || 1) - 1]} ${y}`;
}
const ISSUE_WORD: Record<string, string> = {
  climate: "climate",
  labor: "worker treatment",
  governance: "governance",
  political: "political spending",
};
const IMP: Record<string, string> = { nice: "nice to have", important: "important", dealbreaker: "a dealbreaker" };

function monthsOld(d: string, today = "2026-10") {
  const [ty, tm] = today.split("-").map(Number);
  const [y, m] = d.split("-").map(Number);
  return (ty - y) * 12 + (tm - m);
}

export function caveat(input: ExplainInput): string {
  const { ratings, merchant } = input;
  if (ratings.some((r) => monthsOld(r.date) > 18)) {
    return "Part of this evidence is more than 18 months old, so it may not reflect recent changes.";
  }
  if (ratings.some((r) => r.scope === "parent")) {
    return merchant.differentParent
      ? "This reflects the parent company, not this store."
      : "This reflects the company as a whole, not one store or service.";
  }
  return "These ratings are illustrative and may change as new reports come out.";
}

/** Deterministic 2 to 3 sentence explanation. Always cites a source and a date. */
export function templateExplain(input: ExplainInput): string {
  const { merchant, ratings, label, reasons, notes } = input;
  if (label === "Unknown" || ratings.length === 0) return UNKNOWN_EXPLANATION;

  const cite = (r: ExplainInput["ratings"][number]) => `the ${r.source} (${fmtDate(r.date)})`;
  const sentences: string[] = [];

  if (label === "Aligned") {
    const best = [...ratings].sort((a, b) => b.score - a.score)[0];
    sentences.push(
      `${merchant.name} meets the values you set, and ${cite(best)} scored its ${ISSUE_WORD[best.issue]} ${best.score} out of 100.`,
    );
    const note = notes[0];
    if (note) {
      const issue = note.rule?.kind === "rating" ? note.rule.issue : null;
      const r = issue ? ratings.find((x) => x.issue === issue) : undefined;
      sentences.push(
        r
          ? `${note.label} falls short at ${r.score}, but you marked it nice to have, so it doesn't change the label.`
          : `${note.label} falls short here, but you marked it nice to have, so it doesn't change the label.`,
      );
    }
  } else {
    const reason = reasons[0];
    const rule = reason?.rule as { kind?: string; issue?: string; tag?: string } | undefined;
    const r = rule?.kind === "rating" ? ratings.find((x) => x.issue === rule.issue) : undefined;
    if (r) {
      sentences.push(
        `${merchant.name} is marked ${label} because you marked ${reason.label} as ${IMP[reason.importance]}, and ${cite(r)} scored it ${r.score} out of 100.`,
      );
    } else if (rule?.kind === "entity") {
      sentences.push(`${merchant.name} is marked ${label} because it's owned by ${merchant.parentName} and you chose ${reason.label}.`);
    } else {
      sentences.push(
        `${merchant.name} is marked ${label} because it's in the ${merchant.category.toLowerCase()} category and you marked ${reason?.label ?? "a value"} as ${IMP[reason?.importance ?? "important"]}.`,
      );
    }
    if (!r || reasons.length === 1) {
      const passing = ratings.filter((x) => x !== r && x.score >= 50).sort((a, b) => b.score - a.score)[0];
      if (passing) {
        sentences.push(
          `Its ${ISSUE_WORD[passing.issue]} score of ${passing.score} from ${cite(passing)} meets your bar.`,
        );
      }
    }
  }
  sentences.push(caveat(input));
  return sentences.slice(0, 3).join(" ");
}

const BANNED = /\b(bad|harm|harmful|guilty|guilt|shame|shameful)\b/i;

/** Validate a live explanation: must name a source and a date, stay short, and follow tone rules. */
export function isValidExplanation(text: string, input: ExplainInput): boolean {
  if (!text || text.length > 600) return false;
  if (text.includes("—") || BANNED.test(text)) return false;
  const hasSource = input.ratings.some((r) => text.includes(r.source));
  const hasDate = input.ratings.some((r) => text.includes(fmtDate(r.date)) || text.includes(r.date)) || /\b(20\d\d)\b/.test(text);
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean).length;
  return hasSource && hasDate && sentences >= 2 && sentences <= 4;
}
