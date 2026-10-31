import { describe, expect, it } from "vitest";
import {
  applyActions, categoryTotals, dismissOpportunity, insights, learned, opportunities, planSavings,
  subscriptionProposal, subscriptions, targetProgress, targetProposal, totalSpend, validateAction,
} from "@/lib/tally/analysis";
import { emptyTallyState, type Ctx } from "@/lib/tally/types";
import { personaProfile } from "@/lib/values";

const ctx = (over: Partial<Ctx> = {}): Ctx => ({ ...emptyTallyState, profile: personaProfile("important"), kept: [], budget: 2200, ...over });

describe("tally analysis is grounded in the app's data", () => {
  it("category totals add up to total spend", () => {
    const sum = Object.values(categoryTotals()).reduce((s, c) => s + c.spend, 0);
    expect(Math.round(sum * 100) / 100).toBe(totalSpend());
    expect(totalSpend()).toBe(2000);
  });
  it("finds the two subscriptions by merchant type and never calls them unused", () => {
    const subs = subscriptions();
    expect(subs.map((s) => s.name).sort()).toEqual(["Netflix", "Spotify"]);
    expect(subscriptionProposal("netflix").uncertainty).toMatch(/can see the charge/i);
  });
  it("insights use real numbers", () => {
    const t = insights(ctx()).map((i) => i.text).join(" ");
    expect(t).toMatch(/\$200 left in your \$2200/);
    expect(t).toMatch(/Coffee: \d+ purchases, \$98/);
  });
});

describe("opportunities", () => {
  it("ranks by usefulness and never proposes cutting essentials", () => {
    const o = opportunities(ctx(), 6);
    expect(o.length).toBeGreaterThan(0);
    expect(o.every((x) => x.primary.category !== "Groceries" && x.primary.category !== "Health")).toBe(true);
    for (let i = 1; i < o.length; i++) expect(o[i - 1].score).toBeGreaterThanOrEqual(o[i].score);
  });
  it("shows a mix of idea types, not three of the same", () => {
    const kinds = new Set(opportunities(ctx(), 3).map((o) => o.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(2);
  });
  it("target opportunities save a calculable amount", () => {
    const t = opportunities(ctx(), 6).find((x) => x.kind === "target")!;
    expect(t.primary.impact).toBeCloseTo(t.primary.current! - t.primary.proposed!, 2);
  });
  it("dismissed and already-targeted ideas don't come back", () => {
    const a = opportunities(ctx(), 6).filter((x) => x.kind === "target")[0];
    const b = opportunities(ctx({ dismissed: [a.id] }), 6).map((x) => x.id);
    expect(b).not.toContain(a.id);
    const c = opportunities(ctx({ targets: { [a.primary.category!]: { amount: 1, savings: 1, createdAt: "", source: "" } } }), 6).map((x) => x.id);
    expect(c).not.toContain(a.id);
  });
  it("passing on two merchant-switch ideas stops them for good", () => {
    let s = dismissOpportunity(emptyTallyState, "values:amazon", "t");
    s = dismissOpportunity(s, "values:hm", "t");
    expect(opportunities(ctx(s), 6).some((o) => o.kind === "values")).toBe(false);
    expect(learned(s).some((l) => l.id === "values")).toBe(true);
  });
});

describe("savings plan", () => {
  it("builds a plan for $100 from real categories, with the arithmetic done by code", () => {
    const p = planSavings(100, ctx());
    expect(p.items.length).toBeGreaterThanOrEqual(2);
    expect(p.items.some((i) => i.category === "Groceries")).toBe(false);
    const sum = p.items.filter((i) => i.type === "set_target").reduce((s, i) => s + i.impact!, 0);
    expect(Math.round(sum * 100) / 100).toBe(p.committed);
    expect(p.committed + p.potential + p.shortfall).toBeGreaterThanOrEqual(90);
    expect(p.items.every((i) => (i.impact ?? 0) >= 10)).toBe(true);
    expect(p.tradeoffs.length).toBeGreaterThan(0);
  });
  it("is honest when the goal can't be reached", () => {
    const p = planSavings(5000, ctx());
    expect(p.shortfall).toBeGreaterThan(0);
  });
  it("every item it proposes passes validation", () => {
    const c = ctx();
    for (const i of planSavings(100, c).items) expect(validateAction(i, c)).toEqual([]);
  });
});

describe("action validation", () => {
  const c = ctx();
  it("rejects essentials, inflated savings, wrong current values and deep cuts", () => {
    expect(validateAction({ ...targetProposal("Groceries", 600) }, c).join()).toMatch(/essential/);
    expect(validateAction({ ...targetProposal("Coffee", 80), impact: 90 }, c).join()).toMatch(/don't add up/);
    expect(validateAction({ ...targetProposal("Coffee", 80), current: 500 }, c).join()).toMatch(/doesn't match/);
    expect(validateAction({ ...targetProposal("Coffee", 20) }, c).join()).toMatch(/more than half/);
    expect(validateAction({ ...targetProposal("Coffee", 200) }, c).join()).toMatch(/below what you spend/);
  });
  it("requires an uncertainty note on subscription reviews and rejects non-subscriptions", () => {
    expect(validateAction({ ...subscriptionProposal("netflix"), uncertainty: undefined }, c).join()).toMatch(/can't know/);
    expect(validateAction({ ...subscriptionProposal("netflix"), merchantId: "amazon" }, c).join()).toMatch(/subscription/);
  });
  it("rejects anything that doesn't require approval", () => {
    expect(validateAction({ ...targetProposal("Coffee", 80), requiresApproval: false as unknown as true }, c).join()).toMatch(/approval/);
  });
});

describe("approval flow", () => {
  it("applies approved actions, records decisions, and leaves rejected ones out", () => {
    const c = ctx();
    const good = targetProposal("Coffee", 75);
    const bad = { ...targetProposal("Shopping", 400), impact: 9999 };
    const r = applyActions(emptyTallyState, c, [good, bad, subscriptionProposal("spotify")], "2026-10-30T00:00:00Z", "ask");
    expect(r.applied.map((a) => a.id)).toEqual([good.id, "review:spotify"]);
    expect(r.rejected).toHaveLength(1);
    expect(r.state.targets.Coffee).toMatchObject({ amount: 75, savings: 23 });
    expect(r.state.reviewList).toEqual(["spotify"]);
    expect(r.state.decisions).toHaveLength(2);
    expect(emptyTallyState.targets).toEqual({}); // input state never mutated
  });
  it("won't create a second target for the same category", () => {
    const first = applyActions(emptyTallyState, ctx(), [targetProposal("Coffee", 75)], "t", "x");
    const again = applyActions(first.state, ctx(first.state), [targetProposal("Coffee", 70)], "t", "x");
    expect(again.rejected).toHaveLength(1);
  });
  it("tracks progress against an active target", () => {
    const p = targetProgress("Coffee", 75);
    expect(p.spent).toBe(98);
    expect(p.over).toBe(true);
    expect(targetProgress("Coffee", 150).over).toBe(false);
  });
});

import { buildAnswer, scriptedIntent, templateNarrative, verifyNarrative } from "@/lib/ai/tally";

describe("ask tally", () => {
  it("reads requests offline", () => {
    expect(scriptedIntent("Help me save $100 this month")).toEqual({ intent: "save_amount", amount: 100 });
    expect(scriptedIntent("Am I spending too much on food?")).toEqual({ intent: "category_check", category: "Dining out" });
    expect(scriptedIntent("How can I spend more in line with my values?").intent).toBe("values");
    expect(scriptedIntent("what's the weather").intent).toBe("other");
  });
  it("answers a save request with a real plan and proposals", () => {
    const a = buildAnswer({ intent: "save_amount", amount: 100 }, ctx());
    expect(a.plan?.items.length).toBeGreaterThan(1);
    expect(a.proposals).toEqual(a.plan!.items);
  });
  it("answers a category question with data and no verdict", () => {
    const a = buildAnswer({ intent: "category_check", category: "Dining out" }, ctx());
    expect(a.bullets.join(" ")).toMatch(/no right amount/i);
    expect(a.bullets[0]).toMatch(/\$172/);
  });
  it("values answers don't raise spending when a free option exists, and are only proposals", () => {
    const a = buildAnswer({ intent: "values" }, ctx());
    expect(a.proposals?.every((p) => p.type === "add_to_consideration")).toBe(true);
  });
  it("rejects model narration that invents numbers, orders, or judges", () => {
    const a = buildAnswer({ intent: "save_amount", amount: 100 }, ctx());
    const t = templateNarrative(a);
    expect(verifyNarrative({ narrative: "You will save $777 a month if you do this." }, a)).toBe(t);
    expect(verifyNarrative({ narrative: "You should cut everything right now, it is wasteful." }, a)).toBe(t);
    expect(verifyNarrative({ narrative: "Here is a plan worked out from your spending. Nothing changes until you approve." }, a)).toMatch(/plan worked out/);
  });
});

import { parseMoney } from "@/lib/ai/tally";

describe("can I afford it", () => {
  it("reads money in the ways people type it", () => {
    expect(parseMoney("can i afford a 7k car")).toBe(7000);
    expect(parseMoney("a $7,000 car")).toBe(7000);
    expect(parseMoney("7000 dollars")).toBe(7000);
    expect(parseMoney("no number here")).toBeUndefined();
  });
  it("understands the question offline", () => {
    expect(scriptedIntent("can i afford a 7k car")).toEqual({ intent: "afford", amount: 7000 });
    expect(scriptedIntent("save $100 this month").intent).toBe("save_amount");
  });
  it("answers with real arithmetic and never claims what it can't know", () => {
    const a = buildAnswer({ intent: "afford", amount: 7000 }, ctx());
    const t = a.bullets.join(" ");
    expect(a.title).toBe("A $7,000 purchase");
    expect(t).toMatch(/3\.2 times your \$2,200/);
    expect(t).toMatch(/\$200 left this month/);
    expect(t).toMatch(/35 months/);
    expect(t).toMatch(/can't see your savings or income/);
    expect(t).not.toMatch(/(?<!whether )you (can|cannot|can't) afford/i);
  });
});
