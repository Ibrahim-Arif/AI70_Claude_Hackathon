/**
 * Ask Tally. The model (when available) only (1) reads the request into a small
 * structured intent and (2) words the answer. The plan, the numbers and the
 * proposals are built by lib/tally/analysis.ts, and any number the model writes
 * must already appear in those facts.
 */
import { z } from "zod";
import { alternatives } from "@/data/alternatives";
import { merchantById } from "@/data/merchants";
import { transactions } from "@/data/transactions";
import { alignmentOptions, round2 } from "@/lib/engine";
import { ESSENTIAL } from "@/lib/tally/categories";
import { categoryTotals, considerationProposal, opportunities, planSavings, totalSpend } from "@/lib/tally/analysis";
import type { ActionProposal, Ctx, SavingsPlan } from "@/lib/tally/types";

export const CATEGORIES = ["Coffee", "Dining out", "Groceries", "Shopping", "Getting around", "Subscriptions", "Health"] as const;

export const IntentSchema = z.object({
  intent: z.enum(["save_amount", "category_check", "values", "other"]),
  amount: z.number().min(10).max(5000).optional(),
  category: z.enum(CATEGORIES).optional(),
});
export type Intent = z.infer<typeof IntentSchema>;

const CATEGORY_WORDS: [RegExp, (typeof CATEGORIES)[number]][] = [
  [/coffee|cafe|latte/, "Coffee"],
  [/food|dining|eating out|restaurant|takeout|lunch|dinner/, "Dining out"],
  [/grocer/, "Groceries"],
  [/shopping|clothes|clothing|amazon/, "Shopping"],
  [/transport|uber|gas|fuel|commut|getting around/, "Getting around"],
  [/subscri|streaming|netflix|spotify/, "Subscriptions"],
];

/** Offline reading of the request. Used when there's no API key or the model fails. */
export function scriptedIntent(message: string): Intent {
  const t = message.toLowerCase();
  const amt = t.match(/\$\s?(\d{2,4})|(\d{2,4})\s?(?:dollars|bucks)/);
  const amount = amt ? Number(amt[1] ?? amt[2]) : undefined;
  if (amount && /(save|cut|free up|spend (?:less|\$)|reduce)/.test(t)) return { intent: "save_amount", amount };
  if (/(in line with|align|my values|worker|climate|ethic|alternative|cheaper)/.test(t)) return { intent: "values" };
  const cat = CATEGORY_WORDS.find(([re]) => re.test(t))?.[1];
  if (cat) return { intent: "category_check", category: cat };
  if (/save/.test(t)) return { intent: "save_amount", amount: 100 };
  return { intent: "other" };
}

export type TallyAnswer = {
  title: string;
  bullets: string[];
  plan?: SavingsPlan;
  proposals?: ActionProposal[];
};

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** Deterministic answer. All figures and proposals come from here. */
export function buildAnswer(intent: Intent, ctx: Ctx): TallyAnswer {
  if (intent.intent === "save_amount") {
    const plan = planSavings(intent.amount ?? 100, ctx);
    const bullets: string[] = [];
    if (plan.items.length === 0) {
      return { title: `Saving ${money(plan.objective)}`, bullets: ["Every flexible category already has a target or is too small to trim. You could edit a target from your plans."], plan };
    }
    bullets.push(`Targets would free up ${money(plan.committed)} a month.`);
    if (plan.potential > 0) bullets.push(`Reviewing a subscription might add up to ${money(plan.potential)}, if you find one you don't need.`);
    if (plan.shortfall > 0) bullets.push(`That's ${money(plan.shortfall)} short of ${money(plan.objective)} without touching essentials like groceries.`);
    return { title: `A plan to save ${money(plan.objective)}`, bullets, plan, proposals: plan.items };
  }

  if (intent.intent === "category_check") {
    const cat = intent.category ?? "Dining out";
    const c = categoryTotals()[cat];
    if (!c) return { title: cat, bullets: [`No ${cat.toLowerCase()} spending found this month.`] };
    const share = Math.round((c.spend / totalSpend()) * 100);
    const bullets = [
      `${cat} was ${money(c.spend)} across ${c.count} purchases, about ${money(round2(c.spend / c.count))} each.`,
      `That's ${share}% of the ${money(totalSpend())} you spent.`,
      "There's no right amount. It depends on what you value and what you can afford.",
    ];
    const opp = opportunities(ctx, 8).find((o) => o.primary.category === cat);
    if (ESSENTIAL.has(cat)) bullets.push(`${cat} is essential, so Tally doesn't suggest cutting it.`);
    return { title: `${cat} this month`, bullets, proposals: opp ? [opp.primary] : undefined };
  }

  if (intent.intent === "values") {
    const { options } = alignmentOptions(transactions, merchantById, alternatives, ctx.profile, ctx.kept, 6);
    const free = options.filter((o) => o.monthlyCostDelta <= 0);
    const picked = (free.length ? free : options).filter((o) => !ctx.consideration.some((c) => c.merchantId === o.merchantId)).slice(0, 2);
    if (picked.length === 0) return { title: "Spending in line with your values", bullets: ["We don't see an alternative that fits your values and budget right now. Keeping things as they are is fine."] };
    const bullets = picked.map((o) => `${merchantById[o.merchantId].name} to ${o.alternative.name}: ${o.monthlyCostDelta <= 0 ? `about ${money(Math.abs(o.monthlyCostDelta))} less` : `about ${money(o.monthlyCostDelta)} more`} a month.`);
    if (free.length) bullets.push("These don't raise your spending.");
    return { title: "Moves that fit your values", bullets, proposals: picked.map((o) => considerationProposal(o.merchantId, o.alternative.name)) };
  }

  return {
    title: "Here's what Tally can do",
    bullets: ['Build a plan to save a set amount, like "Save $100 this month".', "Look at a category, like coffee or dining out.", "Find moves that fit your values without raising your spending."],
  };
}

// ---------------------------------------------------------------- narration

export const NarrationSchema = z.object({ narrative: z.string().min(15).max(500) });
const BANNED = /\b(bad|harm|guilty|guilt|shame|wasteful|irresponsible|overspend\w*)\b/i;
const ADVICE = /\b(you should|you must|you need to|we recommend|i recommend|best option)\b/i;

export function templateNarrative(a: TallyAnswer): string {
  if (a.plan) {
    const n = a.plan.items.length;
    return `Here's a plan with ${n} ${n === 1 ? "step" : "steps"}, worked out from your own spending. Nothing changes until you approve it, and you can take any step on its own.`;
  }
  if (a.proposals?.length) return "Here's what the numbers show. You can act on it, or leave things as they are.";
  return "Here's what the numbers show.";
}

/** Reject narration that adds figures, gives orders, or judges. Falls back to the template. */
export function verifyNarrative(raw: unknown, a: TallyAnswer): string {
  const parsed = NarrationSchema.safeParse(raw);
  if (!parsed.success) return templateNarrative(a);
  const facts = JSON.stringify(a);
  const allowed = new Set((facts.match(/\d+(?:\.\d+)?/g) ?? []).map(Number));
  [1, 2, 3, 100].forEach((n) => allowed.add(n));
  const text = parsed.data.narrative;
  const extra = (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter((n) => !allowed.has(n));
  if (extra.length || BANNED.test(text) || ADVICE.test(text) || text.includes("—")) return templateNarrative(a);
  return text;
}
