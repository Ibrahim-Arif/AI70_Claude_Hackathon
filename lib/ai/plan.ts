/**
 * Alignment plan narration. The options and every number come from the rules
 * engine; the model only describes them and is rejected if it advises or invents figures.
 */
import { z } from "zod";
import type { PlanOption } from "@/lib/engine";

export const PlanOutputSchema = z.object({
  narrative: z.string().min(20).max(600),
  questions: z.array(z.string().min(5).max(140)).min(1).max(3),
});
export type PlanNarration = { narrative: string; questions: string[]; source: "live" | "template"; problems: string[] };

const BANNED_TONE = /\b(bad|harm|harmful|guilty|guilt|shame|shameful)\b/i;
const ADVICE = /\b(you should|we recommend|i recommend|best option|best choice|the right choice|you ought|must switch|better off|you need to)\b/i;

export function templatePlan(pctNow: number | null, options: PlanOption[], _names: Record<string, string>, problems: string[] = []): PlanNarration {
  if (options.length === 0) {
    return {
      narrative: "We don't see an alternative that fits your values and your budget right now, so there's nothing to change. Keeping things as they are is a fine place to be.",
      questions: ["Is there a value you'd like to adjust, or a budget you'd like to loosen?"],
      source: "template",
      problems,
    };
  }
  return {
    narrative: `You're at ${pctNow}% today. These moves are optional and each is worked out from your own values. Keeping things as they are is fine too.`,
    questions: ["Which of these, if any, feels realistic for you this month?"],
    source: "template",
    problems,
  };
}

export function verifyPlan(raw: unknown, pctNow: number | null, options: PlanOption[], names: Record<string, string>): PlanNarration {
  const parsed = PlanOutputSchema.safeParse(raw);
  if (!parsed.success) return templatePlan(pctNow, options, names, ["Model output did not match the expected shape."]);
  const ok = new Set<number>([1, 2, 3, 100]);
  if (pctNow !== null) ok.add(pctNow);
  for (const o of options) {
    ok.add(Math.abs(o.monthlyCostDelta));
    ok.add(o.spend);
    if (o.pctAfter !== null) ok.add(o.pctAfter);
    ok.add(Math.abs(o.alternative.priceDeltaPct));
  }
  const text = `${parsed.data.narrative} ${parsed.data.questions.join(" ")}`;
  const problems: string[] = [];
  if (text.includes("—")) problems.push("Used an em dash.");
  if (BANNED_TONE.test(text)) problems.push("Used judgmental wording.");
  if (ADVICE.test(text)) problems.push("Gave a recommendation.");
  const extra = (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter((n) => !ok.has(n));
  if (extra.length) problems.push(`Stated numbers the app did not compute (${extra.join(", ")}).`);
  if (problems.length) return templatePlan(pctNow, options, names, problems);
  return { ...parsed.data, source: "live", problems: [] };
}
