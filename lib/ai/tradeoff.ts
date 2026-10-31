/**
 * Tradeoff narration. Costs and fit come from the rules engine; the model only
 * describes them, and its output is rejected if it adds numbers or gives advice.
 */
import { z } from "zod";
import type { Scenario } from "@/lib/engine";

export const TradeoffOutputSchema = z.object({
  narrative: z.string().min(20).max(700),
  questions: z.array(z.string().min(5).max(140)).min(2).max(3),
});

export type TradeoffNarration = { narrative: string; questions: string[]; source: "live" | "template"; problems: string[] };

const BANNED_TONE = /\b(bad|harm|harmful|guilty|guilt|shame|shameful)\b/i;
const ADVICE = /\b(you should|we recommend|i recommend|best option|best choice|the right choice|you ought|must switch|better off)\b/i;

export function money(n: number) {
  const abs = Math.abs(n);
  return Number.isInteger(abs) ? `$${abs}` : `$${abs.toFixed(2)}`;
}

function allowed(monthlySpend: number, scenarios: Scenario[]) {
  const ok = new Set<number>([monthlySpend, 1, 2, 3, 100, 50]);
  for (const s of scenarios) {
    ok.add(Math.abs(s.monthlyCostDelta));
    ok.add(Math.abs(s.alternative.priceDeltaPct));
  }
  return ok;
}

export const DEFAULT_QUESTIONS = [
  "How much does this one matter to you compared with your other priorities?",
  "Would a partial change, like moving only some of this spending, feel right?",
  "Is keeping things as they are a choice you're comfortable with?",
];

export function templateTradeoff(merchantName: string, monthlySpend: number, scenarios: Scenario[], problems: string[] = []): TradeoffNarration {
  const parts: string[] = [];
  if (scenarios.length === 0) {
    parts.push(`We don't have an alternative to ${merchantName} to compare yet, so keeping things as they are is the only option on the table.`);
  } else {
    parts.push(`You spend about ${money(monthlySpend)} a month at ${merchantName}.`);
    for (const s of scenarios.slice(0, 3)) {
      const d = s.monthlyCostDelta;
      const cost = d === 0 ? "about the same cost" : d > 0 ? `about ${money(d)} more a month` : `about ${money(d)} less a month`;
      const fit = s.withinBudget ? "within the budget you set" : "above the budget you set";
      const meets = s.improvesOn.length ? ` It meets ${s.improvesOn.join(" and ")}.` : "";
      parts.push(`${s.alternative.name} would be ${cost}, ${fit}.${meets}`);
    }
    parts.push("Switching, switching part of it, or keeping it as is are all reasonable choices. It depends on what matters most to you right now.");
  }
  return { narrative: parts.join(" "), questions: DEFAULT_QUESTIONS.slice(0, 3), source: "template", problems };
}

export function verifyTradeoff(raw: unknown, merchantName: string, monthlySpend: number, scenarios: Scenario[]): TradeoffNarration {
  const parsed = TradeoffOutputSchema.safeParse(raw);
  if (!parsed.success) return templateTradeoff(merchantName, monthlySpend, scenarios, ["Model output did not match the expected shape."]);
  const ok = allowed(monthlySpend, scenarios);
  const problems: string[] = [];
  const text = `${parsed.data.narrative} ${parsed.data.questions.join(" ")}`;
  if (text.includes("—")) problems.push("Used an em dash.");
  if (BANNED_TONE.test(text)) problems.push("Used judgmental wording.");
  if (ADVICE.test(text)) problems.push("Gave a recommendation.");
  const nums = (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter((n) => !ok.has(n));
  if (nums.length) problems.push(`Stated numbers the app did not compute (${nums.join(", ")}).`);
  if (problems.length) return templateTradeoff(merchantName, monthlySpend, scenarios, problems);
  return { ...parsed.data, source: "live", problems: [] };
}
