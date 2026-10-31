import { describe, expect, it } from "vitest";
import {
  alternativesFor,
  changedMerchants,
  evaluate,
  flags,
  genericSummary,
  isStale,
  label,
  ratedCoverage,
  reasonText,
  spendByMerchant,
  summarize,
} from "@/lib/engine";
import { merchantById, merchants } from "@/data/merchants";
import { transactions } from "@/data/transactions";
import { alternatives } from "@/data/alternatives";
import type { Importance, Preference, Profile } from "@/lib/types";
import { personaProfile } from "@/lib/values";

const labor = (importance: Importance): Preference => ({
  id: "labor",
  label: "Worker treatment",
  type: "rating",
  rule: { kind: "rating", issue: "labor" },
  importance,
});
const climate = (importance: Importance): Preference => ({
  id: "climate",
  label: "Climate",
  type: "rating",
  rule: { kind: "rating", issue: "climate" },
  importance,
});
const fastFood = (importance: Importance): Preference => ({
  id: "ff",
  label: "Avoid fast-food chains",
  type: "attribute",
  rule: { kind: "attribute", tag: "fast_food", polarity: "avoid" },
  importance,
});
const local = (importance: Importance): Preference => ({
  id: "local",
  label: "Support local",
  type: "attribute",
  rule: { kind: "attribute", tag: "local", polarity: "prefer" },
  importance,
});
const avoidAmazon = (importance: Importance): Preference => ({
  id: "amz",
  label: "Avoid Amazon",
  type: "entity",
  rule: { kind: "entity", parentId: "amazon", polarity: "avoid" },
  importance,
});

const profile = (...preferences: Preference[]): Profile => ({
  name: "Test",
  preferences,
  maxPriceIncreasePct: 5,
});

const EXPECTED_SPEND: Record<string, number> = {
  amazon: 140,
  wholefoods: 73,
  mcdonalds: 38,
  shell: 96,
  hm: 112,
  uber: 88,
  traderjoes: 210,
  costco: 247.52,
  target: 182,
  patagonia: 120,
  starbucks: 64,
  cvs: 46,
  chipotle: 42,
  bluebottle: 34,
  netflix: 15.49,
  spotify: 11.99,
  coop: 250,
  maple: 27,
  juniperthai: 65,
  riverside: 60,
  parking: 78,
};

describe("data", () => {
  it("per-merchant October spend matches the table exactly", () => {
    expect(spendByMerchant(transactions)).toEqual(EXPECTED_SPEND);
  });
  it("every non-excluded transaction resolves through merchantMap", () => {
    for (const t of transactions) {
      if (!t.excluded) expect(t.merchantId, t.rawName).toBeDefined();
    }
  });
  it("has 3 excluded transactions that are never counted", () => {
    const ex = transactions.filter((t) => t.excluded);
    expect(ex.map((t) => t.rawName).sort()).toEqual(
      ["ACH PAYROLL DEPOSIT", "CHASE CREDIT CRD AUTOPAY", "VENMO TRANSFER"],
    );
    expect(transactions.length).toBeGreaterThanOrEqual(55);
  });
  it("marks Shell's climate rating as stale and fresh ratings as not stale", () => {
    const shellClimate = merchantById.shell.ratings.find((r) => r.issue === "climate")!;
    expect(isStale(shellClimate)).toBe(true);
    expect(isStale(merchantById.amazon.ratings[0])).toBe(false);
  });
});

describe("evaluate", () => {
  it("rating: missing → unknown, < 50 → fail, else pass", () => {
    expect(evaluate(merchantById.maple, climate("important"))).toBe("unknown");
    expect(evaluate(merchantById.amazon, labor("important"))).toBe("fail");
    expect(evaluate(merchantById.costco, labor("important"))).toBe("pass");
  });
  it("prefer-rules never fail", () => {
    expect(evaluate(merchantById.target, local("important"))).toBe("na");
    expect(evaluate(merchantById.maple, local("important"))).toBe("pass");
  });
  it("unsupported → na", () => {
    expect(evaluate(merchantById.amazon, { id: "p", label: "Privacy", type: "unsupported", importance: "dealbreaker" })).toBe("na");
  });
});

describe("label: required cases", () => {
  it("Labor Dealbreaker → Amazon Conflicts", () => {
    const r = label(merchantById.amazon, profile(labor("dealbreaker")));
    expect(r.label).toBe("Conflicts");
    expect(reasonText(r)).toBe("Flagged because you marked Worker treatment as a dealbreaker.");
  });
  it("Labor Important → Amazon Mixed", () => {
    expect(label(merchantById.amazon, profile(labor("important"))).label).toBe("Mixed");
  });
  it("Labor Nice → Amazon Aligned, with a note", () => {
    const r = label(merchantById.amazon, profile(labor("nice")));
    expect(r.label).toBe("Aligned");
    expect(r.notes.map((p) => p.id)).toEqual(["labor"]);
  });
  it("Climate Important → Maple Street Bakery Unknown", () => {
    expect(label(merchantById.maple, profile(climate("important"))).label).toBe("Unknown");
  });
  it("Avoid fast food Important → McDonald's Mixed", () => {
    expect(label(merchantById.mcdonalds, profile(fastFood("important"))).label).toBe("Mixed");
  });
  it("Avoid fast food Dealbreaker + Labor Important → Trader Joe's Aligned", () => {
    expect(label(merchantById.traderjoes, profile(fastFood("dealbreaker"), labor("important"))).label).toBe("Aligned");
  });
  it("Support local Important → Target Aligned (na)", () => {
    expect(label(merchantById.target, profile(local("important"))).label).toBe("Aligned");
  });
  it("Avoid Amazon entity Dealbreaker → Whole Foods Conflicts", () => {
    expect(label(merchantById.wholefoods, profile(avoidAmazon("dealbreaker"))).label).toBe("Conflicts");
  });
  it("Nice unknown is ignored; unmapped merchant is Unknown", () => {
    expect(label(merchantById.maple, profile(climate("nice"))).label).toBe("Aligned");
    expect(label(undefined, profile(climate("nice"))).label).toBe("Unknown");
  });
  it("Unknown is never reported as Aligned for unrated merchants under Important values", () => {
    const p = personaProfile();
    for (const id of ["coop", "maple", "juniperthai", "riverside", "parking"]) {
      expect(label(merchantById[id], p).label).toBe("Unknown");
    }
  });
});

describe("summary with the persona", () => {
  it("before: 78%, coverage 76%, 4 flags", () => {
    const p = personaProfile("nice");
    const s = summarize(transactions, merchantById, p);
    expect(s.aligned).toBe(1186);
    expect(s.labeled).toBe(1520);
    expect(s.unknown).toBe(480);
    expect(s.total).toBe(2000);
    expect(s.alignmentPct).toBe(78);
    expect(s.coveragePct).toBe(76);
    expect(flags(transactions, merchantById, p)).toEqual(["hm", "shell", "uber", "mcdonalds"]);
  });

  it("after Labor → Dealbreaker: 64%, 6 flags, 3 changed", () => {
    const before = personaProfile("nice");
    const after = personaProfile("dealbreaker");
    const s = summarize(transactions, merchantById, after);
    expect(s.aligned).toBe(973);
    expect(s.labeled).toBe(1520);
    expect(s.alignmentPct).toBe(64);
    const f = flags(transactions, merchantById, after);
    expect(f).toHaveLength(6);
    expect(f.slice(0, 3)).toEqual(["amazon", "wholefoods", "mcdonalds"]);
    expect(changedMerchants(transactions, merchantById, before, after).sort()).toEqual(
      ["amazon", "mcdonalds", "wholefoods"],
    );
  });

  it("Keep it removes from flags but not from the percentage", () => {
    const p = personaProfile("dealbreaker");
    expect(flags(transactions, merchantById, p, ["amazon"])).not.toContain("amazon");
    expect(summarize(transactions, merchantById, p).alignmentPct).toBe(64);
  });

  it("shows 'not enough data' when coverage < 20%", () => {
    const p = profile({ id: "pol", label: "Political spending", type: "rating", rule: { kind: "rating", issue: "political" }, importance: "important" });
    const s = summarize(transactions, merchantById, p);
    expect(s.coveragePct).toBe(0);
    expect(s.alignmentPct).toBeNull();
  });
});

describe("generic mode", () => {
  it("one-word summaries", () => {
    expect(genericSummary(merchantById.maple)).toBe("Unrated");
    expect(genericSummary(merchantById.shell)).toBe("Weak");
    expect(genericSummary(merchantById.patagonia)).toBe("Strong");
    expect(genericSummary(merchantById.target)).toBe("Mixed");
  });
  it("coverage is 76%", () => {
    expect(ratedCoverage(transactions, merchantById).coveragePct).toBe(76);
  });
});

describe("alternatives at +5%", () => {
  const p = personaProfile("dealbreaker");
  it("Amazon shows Northwind Goods and 1 over budget", () => {
    const r = alternativesFor("amazon", alternatives, p);
    expect(r.fits.map((a) => a.name)).toEqual(["Northwind Goods"]);
    expect(r.overBudgetCount).toBe(1);
  });
  it("Shell has no option within budget", () => {
    expect(alternativesFor("shell", alternatives, p).fits).toHaveLength(0);
  });
  it("covers every merchant in the data", () => {
    expect(merchants).toHaveLength(21);
  });
});
