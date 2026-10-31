import { describe, expect, it } from "vitest";
import { alternatives } from "@/data/alternatives";
import { totalCo2e, co2eOf } from "@/data/emissions";
import { merchantById } from "@/data/merchants";
import { transactions } from "@/data/transactions";
import { scriptedBrowse, verifyBrowse } from "@/lib/ai/browse";
import { templatePlan, verifyPlan } from "@/lib/ai/plan";
import { scriptedParse } from "@/lib/ai/scripted";
import { alignmentOptions, farScoreFor, karmaCredits, label, levelOf, summarize, weightOf } from "@/lib/engine";
import { buildProfile } from "@/lib/store";
import { personaProfile } from "@/lib/values";

const labor = (weight?: number) => ({
  id: "labor",
  label: "Worker treatment",
  type: "rating" as const,
  rule: { kind: "rating" as const, issue: "labor" as const },
  importance: "important" as const,
  weight,
});
const profileWith = (weight?: number) => ({ name: "t", maxPriceIncreasePct: 5 as const, preferences: [labor(weight)] });

describe("free-sliding importance", () => {
  it("reference marks reproduce the legacy ladder", () => {
    expect(weightOf({ importance: "important" })).toBe(50);
    expect(farScoreFor(50)).toBe(30);
    expect(farScoreFor(100)).toBe(50);
    expect(levelOf(0)).toBe("nice");
    expect(levelOf(50)).toBe("important");
    expect(levelOf(100)).toBe("dealbreaker");
  });
  it("sliding between Important and Dealbreaker moves the Conflicts line continuously", () => {
    // Amazon labor = 38. Conflicts once the slider's line rises above 38.
    expect(label(merchantById.amazon, profileWith(50)).label).toBe("Mixed");
    expect(label(merchantById.amazon, profileWith(65)).label).toBe("Mixed"); // line 36
    expect(label(merchantById.amazon, profileWith(75)).label).toBe("Conflicts"); // line 40
    // Monotone: more weight never reduces severity.
    const rank = { Aligned: 0, Unknown: 0, Mixed: 1, Conflicts: 2 } as const;
    let prev = 0;
    for (let w = 30; w <= 100; w += 5) {
      const r = rank[label(merchantById.amazon, profileWith(w)).label];
      expect(r).toBeGreaterThanOrEqual(prev);
      prev = r;
    }
  });
  it("store profiles use the slider weight when set", () => {
    const p = buildProfile({ name: "t", selectedIds: ["labor"], customs: [], importance: { labor: "nice" }, weights: { labor: 72 }, maxPriceIncreasePct: 5, mode: "values" });
    expect(p.preferences[0]).toMatchObject({ weight: 72, importance: "important" });
  });
});

describe("karma and plan", () => {
  const profile = personaProfile("important");
  it("karma is 1 credit per $2 at aligned merchants", () => {
    const s = summarize(transactions, merchantById, profile);
    expect(karmaCredits(s)).toBe(Math.round(s.aligned / 2));
  });
  it("alignment options use only fitting alternatives and raise the percentage", () => {
    const { pctNow, options } = alignmentOptions(transactions, merchantById, alternatives, profile);
    expect(pctNow).toBe(60);
    expect(options.length).toBeGreaterThan(0);
    for (const o of options) {
      expect(o.alternative.priceDeltaPct).toBeLessThanOrEqual(profile.maxPriceIncreasePct);
      expect(o.pctAfter!).toBeGreaterThan(pctNow!);
    }
    expect(options.map((o) => o.merchantId)).not.toContain("shell"); // no affordable alternative
  });
  it("plan narration rejects advice and invented numbers", () => {
    const { pctNow, options } = alignmentOptions(transactions, merchantById, alternatives, profile);
    const names = Object.fromEntries(options.map((o) => [o.merchantId, merchantById[o.merchantId].name]));
    expect(verifyPlan({ narrative: "You should switch everything right away to reach 99% alignment.", questions: ["Why not do it?"] }, pctNow, options, names).source).toBe("template");
    expect(templatePlan(pctNow, options, names).narrative).toMatch(/optional|None of these is required/i);
  });
});

describe("browse and emissions", () => {
  it("scripted browse maps words to real tags only", () => {
    expect(scriptedBrowse("coffee near me").tags).toContain("coffee");
    expect(scriptedBrowse("zzz").source).toBe("none");
    expect(verifyBrowse({ tags: ["made_up_tag"], summary: "Showing something." }, "coffee").tags).toContain("coffee");
  });
  it("emissions are computed from spend, never for excluded transfers", () => {
    expect(totalCo2e()).toBeGreaterThan(0);
    expect(co2eOf({ merchantId: "shell", amount: 100, excluded: true })).toBe(0);
  });
});

describe("contested topics", () => {
  it("asks what to look at, takes no side, and saves the rest as untracked", () => {
    const q = scriptedParse("Israel and Palestine", []);
    expect(q).toMatchObject({ status: "clarify" });
    const political = scriptedParse("Israel and Palestine", [{ q: "x", a: "Company political donations and lobbying" }]);
    expect(political).toMatchObject({ status: "result", preference: { rule: { kind: "rating", issue: "political" } } });
    expect(scriptedParse("Faith and religion", [{ q: "x", a: "Something else" }])).toMatchObject({ status: "unsupported" });
  });
  it("still declines avoiding businesses by who owns them", () => {
    expect(scriptedParse("avoid businesses owned by Christians", [])).toMatchObject({ status: "declined" });
  });
});

import { LENSES, connections, lensReadings, reliability, topFindings } from "@/lib/insights";

describe("insights", () => {
  const profile = personaProfile("important");
  const rows = Object.values(merchantById)
    .filter((m) => m.id)
    .map((m) => ({ merchant: m, spend: 100, result: label(m, profile) }));

  it("top findings put conflicts first and skip kept merchants", () => {
    const f = topFindings(rows, [], 3);
    expect(f[0].kind).toBe("conflict");
    expect(topFindings(rows, ["hm", "shell"], 5).map((x) => x.merchantId)).not.toContain("hm");
  });
  it("evidence gaps are findings, never aligned", () => {
    const p = { ...profile, preferences: [{ ...profile.preferences[0] }] };
    const r = [{ merchant: merchantById.bluebottle, spend: 34, result: label(merchantById.bluebottle, { ...p, preferences: [{ id: "political", label: "Political spending", type: "rating" as const, rule: { kind: "rating" as const, issue: "political" as const }, importance: "important" as const }] }) }];
    expect(topFindings(r, [])[0]).toMatchObject({ kind: "gap", label: "Unknown" });
  });
  it("reliability counts parent-scoped and stale ratings", () => {
    expect(reliability(merchantById.amazon).parentScoped).toBe(4);
    expect(reliability(merchantById.shell).stale).toBe(1);
    expect(reliability(merchantById.maple).level).toBe("limited");
  });
  it("the same merchant reads differently under different priorities, with the same facts", () => {
    const labels = new Set(lensReadings(merchantById.shell).map((l) => l.label));
    expect(LENSES).toHaveLength(3);
    expect(labels.size).toBeGreaterThan(1);
  });
  it("connections list each of the person's values with the rating behind it", () => {
    const c = connections(merchantById.amazon, profile);
    expect(c.find((x) => x.pref.id === "labor")?.rating?.score).toBe(38);
  });
});

import { correctText } from "@/lib/ai/spell";

describe("smarter add-your-own", () => {
  it("fixes typos against Tally's own vocabulary and leaves normal words alone", () => {
    expect(correctText("Fasr food").text).toBe("Fast food");
    expect(correctText("avoid amzon").text).toBe("avoid amazon");
    expect(correctText("I prefer not to eat at fast food chains")).toMatchObject({ changed: false });
    expect(correctText("shop at the market").changed).toBe(false);
  });
  it("a typo still reaches the right result", () => {
    expect(scriptedParse("Fasr food", [])).toMatchObject({ status: "clarify", question: "Does fast casual like Chipotle count?" });
    expect(scriptedParse("Fasr food", [{ q: "x", a: "No" }])).toMatchObject({ status: "result", preference: { label: "Avoid fast-food chains" } });
  });
  it("animal fur asks how specific, then saves the specific version", () => {
    const q = scriptedParse("animal fur", []);
    expect(q).toMatchObject({ status: "clarify", question: "How specific do you want to be?" });
    expect(scriptedParse("animal fur", [{ q: "x", a: "Fur and leather" }])).toMatchObject({ status: "unsupported", label: "Avoid fur and leather" });
  });
  it("LGBTQ+ rights maps only to data Tally has and takes no side", () => {
    expect(scriptedParse("LGBTQ+ rights", [])).toMatchObject({ status: "clarify" });
    expect(scriptedParse("LGBTQ+ rights", [{ q: "x", a: "Company political donations and lobbying" }])).toMatchObject({ status: "result", preference: { rule: { kind: "rating", issue: "political" } } });
    expect(scriptedParse("LGBTQ+ rights", [{ q: "x", a: "Workplace policies for LGBTQ+ employees" }])).toMatchObject({ status: "unsupported" });
    expect(scriptedParse("avoid businesses owned by gay people", [])).toMatchObject({ status: "declined" });
  });
});
