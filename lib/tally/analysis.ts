/**
 * Everything Tally says about money is computed here, from the app's own data.
 * Pure functions: no AI, no store, no network. The AI parses requests and words
 * explanations; it never produces or changes a number.
 */
import { alternatives } from "@/data/alternatives";
import { merchantById, merchants } from "@/data/merchants";
import { transactions } from "@/data/transactions";
import { alignmentOptions, label, round2, spendByMerchant } from "@/lib/engine";
import { CUT_CAP, ESSENTIAL, MIN_CATEGORY_SPEND, PLAN_ORDER, categoryOf } from "./categories";
import type { ActionProposal, Ctx, Decision, Insight, Opportunity, SavingsPlan, TallyState } from "./types";

const SPEND = spendByMerchant(transactions);
const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

export type CategoryTotal = { category: string; spend: number; count: number; merchantIds: string[] };

export function categoryTotals(): Record<string, CategoryTotal> {
  const out: Record<string, CategoryTotal> = {};
  for (const m of merchants) {
    const s = SPEND[m.id];
    if (!s) continue;
    const c = categoryOf(m);
    const row = (out[c] ??= { category: c, spend: 0, count: 0, merchantIds: [] });
    row.spend = round2(row.spend + s);
    row.merchantIds.push(m.id);
  }
  for (const t of transactions) {
    if (t.excluded || !t.merchantId) continue;
    const c = categoryOf(merchantById[t.merchantId]);
    if (out[c]) out[c].count += 1;
  }
  return out;
}

export const purchaseCount = (merchantId: string) => transactions.filter((t) => t.merchantId === merchantId && !t.excluded).length;
export const totalSpend = () => round2(Object.values(SPEND).reduce((a, b) => a + b, 0));

/** Subscriptions identified by merchant type. We can see the charge, not whether it's used. */
export function subscriptions() {
  return merchants
    .filter((m) => m.tags.includes("subscription") && SPEND[m.id])
    .map((m) => ({ merchantId: m.id, name: m.name, monthly: SPEND[m.id] }))
    .sort((a, b) => b.monthly - a.monthly);
}

// ---------------------------------------------------------------- insights

export function insights(ctx: Ctx): Insight[] {
  const out: Insight[] = [];
  const total = totalSpend();
  const left = round2(ctx.budget - total);
  out.push({
    id: "budget",
    text: left >= 0 ? `You have ${money(left)} left in your ${money(ctx.budget)} monthly budget.` : `You're ${money(-left)} over your ${money(ctx.budget)} monthly budget.`,
  });
  const cats = Object.values(categoryTotals());
  const flexible = cats.filter((c) => !ESSENTIAL.has(c.category)).sort((a, b) => b.spend - a.spend);
  if (flexible[0]) out.push({ id: "top", text: `${flexible[0].category} is your biggest flexible category at ${money(flexible[0].spend)} across ${flexible[0].count} purchases.` });
  const subs = subscriptions();
  if (subs.length) out.push({ id: "subs", text: `You have ${subs.length} recurring ${subs.length === 1 ? "subscription" : "subscriptions"} totaling ${money(round2(subs.reduce((s, x) => s + x.monthly, 0)))} a month.` });
  const coffee = cats.find((c) => c.category === "Coffee");
  if (coffee) out.push({ id: "coffee", text: `Coffee: ${coffee.count} purchases, ${money(coffee.spend)}, about ${money(round2(coffee.spend / coffee.count))} each.` });
  return out;
}

// ---------------------------------------------------------------- proposals

const uid = (p: string, k: string) => `${p}:${k}`;

export function targetProposal(category: string, proposed: number, why?: string): ActionProposal {
  const c = categoryTotals()[category];
  const current = c ? c.spend : 0;
  return {
    id: uid("target", category),
    type: "set_target",
    description: `Cap ${category.toLowerCase()} at ${money(proposed)} a month`,
    category,
    current,
    proposed,
    impact: round2(current - proposed),
    explanation: why ?? `${category} was ${money(current)} this month. Capping it at ${money(proposed)} frees up ${money(round2(current - proposed))}.`,
    requiresApproval: true,
  };
}

export function subscriptionProposal(merchantId: string): ActionProposal {
  const s = subscriptions().find((x) => x.merchantId === merchantId);
  const m = merchantById[merchantId];
  return {
    id: uid("review", merchantId),
    type: "review_subscriptions",
    description: `Add ${m?.name ?? "this subscription"} to your review list`,
    merchantId,
    current: s?.monthly ?? null,
    proposed: null,
    impact: s?.monthly ?? null,
    explanation: "Adds it to a list for you to check. Tally can't cancel anything.",
    uncertainty: "We can see the charge but not whether you use it, so this may save nothing.",
    requiresApproval: true,
  };
}

export function considerationProposal(merchantId: string, altName: string): ActionProposal {
  const m = merchantById[merchantId];
  const alt = alternatives.find((a) => a.forMerchantId === merchantId && a.name === altName);
  const spend = SPEND[merchantId] ?? 0;
  const proposed = alt ? round2(spend * (1 + alt.priceDeltaPct / 100)) : null;
  return {
    id: uid("consider", `${merchantId}:${altName}`),
    type: "add_to_consideration",
    description: `Add ${altName} to your consideration list`,
    merchantId,
    altName,
    current: spend,
    proposed,
    impact: proposed === null ? null : round2(spend - proposed),
    explanation: `Saves ${altName} next to ${m?.name} so you can compare later. You aren't switching anything.`,
    uncertainty: "Alternatives and prices are illustrative in this demo.",
    requiresApproval: true,
  };
}

// ---------------------------------------------------------------- opportunities

export function opportunities(ctx: Ctx, limit = 3): Opportunity[] {
  const out: Opportunity[] = [];
  const cats = categoryTotals();
  const valuesSuppressed = ctx.dismissed.filter((d) => d.startsWith("values:")).length >= 2;

  for (const c of Object.values(cats)) {
    const cap = CUT_CAP[c.category];
    if (!cap || ESSENTIAL.has(c.category) || c.spend < MIN_CATEGORY_SPEND) continue;
    if (ctx.targets[c.category] || ctx.dismissed.includes(`target:${c.category}`)) continue;
    const proposed = Math.ceil((c.spend * (1 - cap)) / 5) * 5;
    const p = targetProposal(c.category, proposed);
    const avg = round2(c.spend / c.count);
    out.push({
      id: p.id,
      kind: "target",
      headline: `You could free up ${money(p.impact!)} this month.`,
      why: `${c.category} was ${money(c.spend)} across ${c.count} purchases, about ${money(avg)} each. A ${money(proposed)} cap keeps the category and gives you more room.`,
      impact: p.impact,
      uncertainty: "Based on one month of data, so it may not be typical.",
      primary: p,
      score: p.impact!,
    });
  }

  const subs = subscriptions().filter((s) => !ctx.reviewList.includes(s.merchantId));
  if (subs.length && !ctx.dismissed.includes("subs")) {
    const first = subs[0];
    const total = round2(subs.reduce((s, x) => s + x.monthly, 0));
    const p = subscriptionProposal(first.merchantId);
    out.push({
      id: "subs",
      kind: "subscriptions",
      headline: `Your subscriptions add up to ${money(total)} a month.`,
      why: `${subs.map((s) => `${s.name} ${money(s.monthly)}`).join(", ")}. Worth a look to see if you still use each one.`,
      impact: total,
      uncertainty: "We can see the charges but not how often you use them. Low activity isn't the same as unused.",
      primary: p,
      score: total * 0.6,
    });
  }

  if (!valuesSuppressed) {
    const { options } = alignmentOptions(transactions, merchantById, alternatives, ctx.profile, ctx.kept, 6);
    const o = options.find((x) => !ctx.dismissed.includes(`values:${x.merchantId}`) && !ctx.consideration.some((c) => c.merchantId === x.merchantId));
    if (o) {
      const m = merchantById[o.merchantId];
      const reason = label(m, ctx.profile).reasons[0]?.label ?? "what you told us";
      const p = considerationProposal(o.merchantId, o.alternative.name);
      out.push({
        id: `values:${o.merchantId}`,
        kind: "values",
        headline: `You shop at ${m.name} ${purchaseCount(m.id)} times a month.`,
        why: `You said ${reason.toLowerCase()} matters to you, and ${m.name} falls short there. ${o.alternative.name} may fit better.`,
        impact: p.impact,
        valuesNote: `Connects to your value: ${reason}.`,
        uncertainty: "The evidence is incomplete, and the alternative's price is illustrative. Staying put is a fine choice.",
        primary: p,
        secondary: { label: "Compare options", merchantId: m.id },
        score: 18,
      });
    }
  }
  // Show a mix, not three of the same: the best idea of each kind first, then the next best.
  const ranked = out.sort((a, b) => b.score - a.score);
  const picked: Opportunity[] = [];
  for (const kind of ["target", "subscriptions", "values"] as const) {
    const best = ranked.find((o) => o.kind === kind);
    if (best && picked.length < limit) picked.push(best);
  }
  for (const o of ranked) if (picked.length < limit && !picked.includes(o)) picked.push(o);
  return picked.sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------- savings plan

export function planSavings(objective: number, ctx: Ctx): SavingsPlan {
  const cats = categoryTotals();
  let remaining = round2(objective);
  const items: ActionProposal[] = [];
  let committed = 0;

  const ordered = PLAN_ORDER.map((c) => cats[c]).filter(Boolean).sort((a, b) => b.count - a.count || b.spend - a.spend);
  for (const c of ordered) {
    if (remaining < 10) break;
    if (ctx.targets[c.category] || c.spend < MIN_CATEGORY_SPEND || ESSENTIAL.has(c.category)) continue;
    const cap = Math.floor((c.spend * CUT_CAP[c.category]) / 5) * 5;
    if (cap < 5) continue;
    const cut = Math.min(cap, Math.ceil(remaining / 5) * 5);
    const proposed = Math.floor(c.spend - cut);
    const p = targetProposal(c.category, proposed);
    items.push(p);
    committed = round2(committed + p.impact!);
    remaining = round2(remaining - p.impact!);
  }

  let potential = 0;
  if (remaining >= 10) {
    const sub = subscriptions().filter((s) => !ctx.reviewList.includes(s.merchantId)).at(-1);
    if (sub) {
      const p = subscriptionProposal(sub.merchantId);
      items.push(p);
      potential = p.impact!;
      remaining = round2(remaining - potential);
    }
  }

  const tradeoffs = items
    .filter((i) => i.type === "set_target")
    .map((i) => {
      const c = cats[i.category!];
      const avg = c.spend / c.count;
      const kept = Math.floor(i.proposed! / avg);
      return `${i.category}: ${money(i.current!)} to ${money(i.proposed!)} means roughly ${kept} purchases at your usual ${money(round2(avg))}, instead of ${c.count}.`;
    });
  if (potential > 0) tradeoffs.push("The subscription review only saves money if you find one you no longer need.");

  return { id: `plan:${objective}:${items.map((i) => i.id).join("|")}`, objective, items, committed, potential, shortfall: remaining >= 10 ? round2(remaining) : 0, tradeoffs };
}

// ---------------------------------------------------------------- validation + execution

const near = (a: number | null, b: number | null) => a !== null && b !== null && Math.abs(a - b) < 0.011;

/** Every proposal is checked against the app's own data and rules before it can run. */
export function validateAction(a: ActionProposal, ctx: Ctx): string[] {
  const errors: string[] = [];
  if (a.requiresApproval !== true) errors.push("Changes must require approval.");
  if (!a.description.trim()) errors.push("Missing description.");
  const cats = categoryTotals();

  switch (a.type) {
    case "set_target": {
      const c = a.category ? cats[a.category] : undefined;
      if (!c) return [...errors, "Unknown category."];
      if (ESSENTIAL.has(c.category)) errors.push(`${c.category} is essential, so Tally won't propose cutting it.`);
      if (!near(a.current, c.spend)) errors.push("The current spending doesn't match your data.");
      if (a.proposed === null || !Number.isFinite(a.proposed) || a.proposed <= 0) errors.push("The target must be a positive number.");
      else {
        if (a.proposed >= c.spend) errors.push("A target should be below what you spend now.");
        if (a.proposed < c.spend * 0.5) errors.push("Tally won't propose cutting a category by more than half.");
        if (!near(a.impact, c.spend - a.proposed)) errors.push("The expected savings don't add up.");
      }
      break;
    }
    case "review_subscriptions": {
      const s = subscriptions().find((x) => x.merchantId === a.merchantId);
      if (!s) errors.push("That isn't a subscription we can identify.");
      else if (!near(a.current, s.monthly) || !near(a.impact, s.monthly)) errors.push("The amount doesn't match your data.");
      if (!a.uncertainty) errors.push("A subscription review must say what we can't know.");
      break;
    }
    case "add_to_consideration": {
      const alt = alternatives.find((x) => x.forMerchantId === a.merchantId && x.name === a.altName);
      if (!alt) errors.push("Unknown alternative.");
      break;
    }
    case "set_monthly_budget": {
      if (a.proposed === null || !Number.isFinite(a.proposed) || a.proposed < 500 || a.proposed > 20000) errors.push("The budget must be between $500 and $20,000.");
      break;
    }
    default:
      errors.push("Unknown action type.");
  }
  if (ctx && a.type === "set_target" && a.category && ctx.targets[a.category]) errors.push("You already have a target for this. Edit it from your plans.");
  return errors;
}

export type ApplyResult = { state: TallyState; budget?: number; applied: ActionProposal[]; rejected: { action: ActionProposal; errors: string[] }[] };

/** Applies approved proposals to a copy of the state. Invalid ones are rejected and change nothing. */
export function applyActions(state: TallyState, ctx: Ctx, actions: ActionProposal[], now: string, source: string): ApplyResult {
  const next: TallyState = { ...state, targets: { ...state.targets }, reviewList: [...state.reviewList], consideration: [...state.consideration], decisions: [...state.decisions], dismissed: [...state.dismissed] };
  let budget: number | undefined;
  const applied: ActionProposal[] = [];
  const rejected: ApplyResult["rejected"] = [];
  for (const a of actions) {
    const live: Ctx = { ...ctx, ...next };
    const errors = validateAction(a, live);
    if (errors.length) {
      rejected.push({ action: a, errors });
      continue;
    }
    if (a.type === "set_target") next.targets[a.category!] = { amount: a.proposed!, savings: a.impact ?? 0, createdAt: now, source };
    if (a.type === "review_subscriptions" && !next.reviewList.includes(a.merchantId!)) next.reviewList.push(a.merchantId!);
    if (a.type === "add_to_consideration") next.consideration.push({ merchantId: a.merchantId!, alt: a.altName! });
    if (a.type === "set_monthly_budget") budget = a.proposed!;
    next.decisions.push({ id: `${a.id}@${now}`, at: now, status: "approved", kind: a.type, summary: a.description });
    applied.push(a);
  }
  return { state: next, budget, applied, rejected };
}

export function dismissOpportunity(state: TallyState, id: string, now: string): TallyState {
  if (state.dismissed.includes(id)) return state;
  const d: Decision = { id: `${id}@${now}`, at: now, status: "dismissed", kind: id.split(":")[0], summary: `Passed on ${id}` };
  return { ...state, dismissed: [...state.dismissed, id], decisions: [...state.decisions, d] };
}

// ---------------------------------------------------------------- progress + learning

export function targetProgress(category: string, amount: number) {
  const spent = categoryTotals()[category]?.spend ?? 0;
  return { spent, remaining: round2(amount - spent), pct: Math.min(100, Math.round((spent / amount) * 100)), over: spent > amount };
}

/** What Tally has learned from the person's own choices, in plain words, so they can inspect and reset it. */
export function learned(state: TallyState): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  if (state.dismissed.filter((d) => d.startsWith("values:")).length >= 2) out.push({ id: "values", text: "You've passed on merchant-switch ideas, so Tally will stop suggesting them." });
  for (const d of state.dismissed.filter((x) => x.startsWith("target:"))) out.push({ id: d, text: `You passed on a ${d.slice(7).toLowerCase()} target, so Tally won't suggest one again.` });
  if (state.dismissed.includes("subs")) out.push({ id: "subs", text: "You passed on reviewing subscriptions, so Tally won't suggest it again." });
  const targets = Object.keys(state.targets);
  if (targets.length) out.push({ id: "targets", text: `You've set targets for ${targets.join(" and ").toLowerCase()}. Tally won't suggest those again.` });
  return out;
}
