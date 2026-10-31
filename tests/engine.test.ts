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
import { CATALOG, catalogById, personaProfile } from "@/lib/values";

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
  it("Labor Dealbreaker → Amazon (labor 38) Conflicts", () => {
    const r = label(merchantById.amazon, profile(labor("dealbreaker")));
    expect(r.label).toBe("Conflicts");
    expect(reasonText(r)).toBe("Flagged because you marked Worker treatment as a dealbreaker.");
  });
  it("Labor Important → Amazon (labor 38) Mixed", () => {
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

describe("far below (score < 30) on an Important value", () => {
  it("Climate Important → Shell (22) Conflicts, H&M (45) Mixed", () => {
    const r = label(merchantById.shell, profile(climate("important")));
    expect(r.label).toBe("Conflicts");
    expect(reasonText(r)).toBe("Flagged because it falls far short on Climate, which you marked as important.");
    expect(label(merchantById.hm, profile(climate("important"))).label).toBe("Mixed");
  });
  it("Climate Nice → Shell Aligned, with a note (nice never flags)", () => {
    const r = label(merchantById.shell, profile(climate("nice")));
    expect(r.label).toBe("Aligned");
    expect(r.notes).toHaveLength(1);
  });
});

describe("predictable conflicts", () => {
  const rated = CATALOG.filter((c) => c.pref.type === "rating");
  it.each(rated.map((c) => [c.id]))("%s alone at its default slider position gives at least one Conflict and one Mixed", (id) => {
    const c = catalogById[id];
    const p = profile({ ...c.pref, importance: c.defaultImportance });
    const s = summarize(transactions, merchantById, p);
    const labels = Object.values(s.labels);
    expect(labels).toContain("Conflicts");
    expect(labels).toContain("Mixed");
    expect(labels).toContain("Aligned");
    expect(labels).toContain("Unknown");
  });
  it("only open-ended topics are untracked in the catalog", () => {
    expect(CATALOG.filter((c) => c.pref.type === "unsupported").map((c) => c.id)).toEqual(["animal", "israelpalestine", "faith"]);
  });
  it("Blue Bottle is Unknown when Political spending matters (no rating)", () => {
    const c = catalogById.political;
    expect(label(merchantById.bluebottle, profile({ ...c.pref, importance: "important" })).label).toBe("Unknown");
  });
});

describe("summary with the persona", () => {
  it("before: 60%, coverage 76%, 2 Conflicts + 5 Mixed = 7 flags", () => {
    const p = personaProfile();
    const s = summarize(transactions, merchantById, p);
    expect(s.aligned).toBe(909);
    expect(s.mixed).toBe(403);
    expect(s.conflicts).toBe(208);
    expect(s.labeled).toBe(1520);
    expect(s.unknown).toBe(480);
    expect(s.total).toBe(2000);
    expect(s.alignmentPct).toBe(60);
    expect(s.coveragePct).toBe(76);
    expect(flags(transactions, merchantById, p)).toEqual(["hm", "shell", "amazon", "uber", "wholefoods", "starbucks", "mcdonalds"]);
  });

  it("after Worker treatment → Dealbreaker: 6 Conflicts, 1 Mixed, 4 changed", () => {
    const before = personaProfile("important");
    const after = personaProfile("dealbreaker");
    const s = summarize(transactions, merchantById, after);
    expect(s.conflicts).toBe(523);
    expect(s.mixed).toBe(88);
    expect(s.alignmentPct).toBe(60);
    const f = flags(transactions, merchantById, after);
    expect(f).toEqual(["amazon", "hm", "shell", "wholefoods", "starbucks", "mcdonalds", "uber"]);
    expect(changedMerchants(transactions, merchantById, before, after).sort()).toEqual(
      ["amazon", "mcdonalds", "starbucks", "wholefoods"],
    );
  });

  it("after Worker treatment → Nice: 75%, Shell still Conflicts, Amazon gets a note", () => {
    const p = personaProfile("nice");
    const s = summarize(transactions, merchantById, p);
    expect(s.alignmentPct).toBe(Math.round(((909 + 140 + 73 + 64) / 1520) * 100));
    expect(label(merchantById.shell, p).label).toBe("Conflicts");
    expect(label(merchantById.amazon, p).notes.map((x) => x.id)).toEqual(["labor"]);
  });

  it("Keep it removes from flags but not from the percentage", () => {
    const p = personaProfile("dealbreaker");
    expect(flags(transactions, merchantById, p, ["amazon"])).not.toContain("amazon");
    expect(summarize(transactions, merchantById, p).alignmentPct).toBe(60);
  });

  it("shows 'not enough data' when coverage < 20%", () => {
    const local = new Set(["coop", "maple", "juniperthai", "riverside", "parking", "spotify"]);
    const txs = transactions.filter((t) => t.merchantId && local.has(t.merchantId));
    const s = summarize(txs, merchantById, profile(climate("important")));
    expect(s.coveragePct).toBeLessThan(20);
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
  it("H&M shows Thread Second (secondhand, -20%)", () => {
    expect(alternativesFor("hm", alternatives, p).fits.map((a) => a.name)).toEqual(["Thread Second"]);
  });
  it("Shell has no option within budget", () => {
    expect(alternativesFor("shell", alternatives, p).fits).toHaveLength(0);
  });
  it("covers every merchant in the data", () => {
    expect(merchants).toHaveLength(21);
  });
});
