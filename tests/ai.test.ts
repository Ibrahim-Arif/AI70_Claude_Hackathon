import { describe, expect, it } from "vitest";
import { isIdentityAvoidance, scriptedParse } from "@/lib/ai/scripted";
import { ParseOutputSchema, type ExplainInput } from "@/lib/ai/schemas";
import { isValidExplanation, templateExplain } from "@/lib/ai/explainTemplate";
import { merchantById } from "@/data/merchants";
import { label } from "@/lib/engine";
import { personaProfile } from "@/lib/values";

describe("scripted parse", () => {
  it("fast food: clarify, then result on No", () => {
    const q = scriptedParse("I prefer not to eat at fast food chains", []);
    expect(q).toMatchObject({ status: "clarify", question: "Does fast casual like Chipotle count?", options: ["Yes", "No"] });
    const r = scriptedParse("I prefer not to eat at fast food chains", [{ q: "Does fast casual like Chipotle count?", a: "No" }]);
    expect(r).toMatchObject({
      status: "result",
      preference: { label: "Avoid fast-food chains", rule: { kind: "attribute", tag: "fast_food", polarity: "avoid" } },
      basis: "Based on merchant category",
    });
  });
  it("Avoid Amazon covers Whole Foods", () => {
    expect(scriptedParse("Avoid Amazon", [])).toMatchObject({
      status: "result",
      preference: { rule: { kind: "entity", parentId: "amazon" } },
      summary: "Also covers Whole Foods (owned by Amazon).",
    });
  });
  it("political association asks two questions, then returns a rating rule", () => {
    expect(scriptedParse("political association", [])).toMatchObject({ status: "clarify", progress: { step: 1, total: 2 } });
    expect(scriptedParse("political association", [{ q: "1", a: "x" }])).toMatchObject({ status: "clarify", question: "Which counts?" });
    expect(scriptedParse("political association", [{ q: "1", a: "x" }, { q: "2", a: "Corporate PAC" }])).toMatchObject({
      status: "result",
      preference: { rule: { kind: "rating", issue: "political" } },
    });
  });
  it("parental leave is unsupported", () => {
    expect(scriptedParse("companies with good parental leave", [])).toMatchObject({ status: "unsupported" });
  });
  it("unknown input returns null (generic fallback)", () => {
    expect(scriptedParse("something else entirely", [])).toBeNull();
  });
  it("every scripted output passes the zod schema", () => {
    const cases: [string, { q: string; a: string }[]][] = [
      ["I prefer not to eat at fast food chains", []],
      ["I prefer not to eat at fast food chains", [{ q: "q", a: "Yes" }]],
      ["Avoid Amazon", []],
      ["political association", []],
      ["political association", [{ q: "1", a: "x" }, { q: "2", a: "Trade groups" }]],
      ["companies with good parental leave", []],
      ["don't buy from businesses owned by immigrants", []],
    ];
    for (const [t, h] of cases) expect(ParseOutputSchema.safeParse(scriptedParse(t, h)).success, t).toBe(true);
  });
});

describe("identity-based avoidance", () => {
  it("declines avoidance based on owners' identity", () => {
    expect(isIdentityAvoidance("avoid stores owned by immigrants")).toBe(true);
    expect(isIdentityAvoidance("I don't want to shop at Muslim-owned businesses")).toBe(true);
    expect(scriptedParse("boycott women-owned shops", [])).toMatchObject({ status: "declined" });
  });
  it("allows support framing and unrelated avoidance", () => {
    expect(isIdentityAvoidance("support women-owned businesses")).toBe(false);
    expect(isIdentityAvoidance("avoid fast food")).toBe(false);
  });
});

describe("explanations", () => {
  const profile = personaProfile("dealbreaker");
  const m = merchantById.amazon;
  const r = label(m, profile);
  const input: ExplainInput = {
    cacheKey: "amazon:x",
    mode: "scripted",
    merchant: { id: m.id, name: m.name, category: m.category, parentName: "Amazon", differentParent: false },
    ratings: m.ratings,
    label: r.label,
    reasons: r.reasons.map((p) => ({ label: p.label, importance: p.importance, rule: p.rule })),
    notes: [],
    profile: { preferences: [] },
  };

  it("template cites a source and date, 2 to 3 sentences, ends with a caveat", () => {
    const t = templateExplain(input);
    expect(t).toContain("Illustrative Labor Index");
    expect(t).toContain("Mar 2026");
    expect(t).not.toContain("—");
    expect(isValidExplanation(t, input)).toBe(true);
  });
  it("Shell's caveat mentions stale evidence", () => {
    const shell = merchantById.shell;
    const t = templateExplain({ ...input, merchant: { ...input.merchant, id: "shell", name: "Shell" }, ratings: shell.ratings, label: "Mixed", reasons: [{ label: "Climate", importance: "important", rule: { kind: "rating", issue: "climate" } }] });
    expect(t).toMatch(/more than 18 months old/);
  });
  it("rejects AI text without a source or date, or with banned words", () => {
    expect(isValidExplanation("Amazon is flagged. It is complicated.", input)).toBe(false);
    expect(isValidExplanation("Amazon does harm. The Illustrative Labor Index (Mar 2026) scored it 32.", input)).toBe(false);
    expect(
      isValidExplanation(
        "Amazon falls short on worker treatment, which you marked as a dealbreaker. The Illustrative Labor Index (Mar 2026) scored it 32 out of 100. This reflects the company as a whole.",
        input,
      ),
    ).toBe(true);
  });
  it("Unknown merchants get the fixed text", () => {
    expect(templateExplain({ ...input, label: "Unknown" })).toBe("There isn't enough reliable evidence to recommend a change here.");
  });
});
