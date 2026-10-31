import { describe, expect, it } from "vitest";
import { alternatives } from "@/data/alternatives";
import { merchantById } from "@/data/merchants";
import { buildExplainInput } from "@/lib/ai/client";
import { templateResearch, verifyResearch } from "@/lib/ai/research";
import { templateTradeoff, verifyTradeoff } from "@/lib/ai/tradeoff";
import { exploreTradeoff, label } from "@/lib/engine";
import { personaProfile } from "@/lib/values";

const profile = personaProfile("important");
const input = (id: string) => buildExplainInput(merchantById[id], label(merchantById[id], profile), profile, "scripted");

describe("grounded research", () => {
  const amazon = input("amazon");
  const labor = merchantById.amazon.ratings.find((r) => r.issue === "labor")!;

  it("keeps a claim that cites a real rating and attaches the citation by code", () => {
    const r = verifyResearch(
      {
        summary: "Amazon is flagged because labor falls short of your bar in the rating we have.",
        findings: [{ issue: "labor", text: `Worker treatment scored ${labor.score} in the ${labor.source} (Mar 2026).` }],
      },
      amazon,
    );
    expect(r.source).toBe("live");
    expect(r.findings.find((f) => f.issue === "labor")?.cite).toMatchObject({ source: labor.source, score: labor.score });
    expect(r.grounding.ok).toBe(true);
  });

  it("drops claims with invented numbers and falls back to the template", () => {
    const r = verifyResearch(
      { summary: "Amazon is flagged for the reasons shown in the ratings below.", findings: [{ issue: "labor", text: "Worker treatment scored 12 in the labor index." }] },
      amazon,
    );
    expect(r.source).toBe("template");
    expect(r.grounding.ok).toBe(false);
    expect(r.grounding.problems.join(" ")).toMatch(/not in the ratings/);
  });

  it("drops claims about issues with no rating, so unknown is never made up", () => {
    const bb = input("bluebottle");
    const r = verifyResearch(
      { summary: "Blue Bottle has limited evidence in our sources.", findings: [{ issue: "privacy", text: "Privacy looks fine according to a report." }] },
      bb,
    );
    expect(r.findings.some((f) => f.issue === "privacy")).toBe(false);
    expect(r.unknowns.join(" ")).toMatch(/privacy/);
  });

  it("rejects funding language and judgmental words", () => {
    const r = verifyResearch(
      { summary: "Your purchase funded a bad practice at this company.", findings: [{ issue: "labor", text: `Worker treatment scored ${labor.score} in the ${labor.source}.` }] },
      amazon,
    );
    expect(r.summary).not.toMatch(/funded|bad/);
    expect(r.grounding.ok).toBe(false);
  });

  it("template always cites a source and flags stale evidence", () => {
    const shell = templateResearch(input("shell"));
    expect(shell.findings.length).toBeGreaterThan(0);
    expect(shell.findings.some((f) => f.cite.stale)).toBe(true);
    expect(shell.findings[0].text).toMatch(/Illustrative/);
  });

  it("malformed model output falls back to the template", () => {
    expect(verifyResearch({ nope: true }, amazon).source).toBe("template");
  });
});

describe("tradeoff explorer", () => {
  const amazon = merchantById.amazon;
  const scenarios = exploreTradeoff(amazon, 140, alternatives, profile);

  it("computes costs and budget fit deterministically", () => {
    const nw = scenarios.find((s) => s.alternative.name === "Northwind Goods")!;
    expect(nw.monthlyCostDelta).toBe(5.6);
    expect(nw.withinBudget).toBe(true);
    const harbor = scenarios.find((s) => s.alternative.name === "Harbor & Co.")!;
    expect(harbor.monthlyCostDelta).toBe(12.6);
    expect(harbor.withinBudget).toBe(false);
  });

  it("accepts a neutral narration that uses only computed numbers", () => {
    const r = verifyTradeoff(
      {
        narrative: "You spend about $140 a month at Amazon. Northwind Goods would be about $5.60 more a month. Keeping things as they are is also a reasonable choice.",
        questions: ["How much does this matter to you?", "Would moving part of it feel right?"],
      },
      "Amazon",
      140,
      scenarios,
    );
    expect(r.source).toBe("live");
  });

  it("rejects advice and invented figures", () => {
    const advice = verifyTradeoff(
      { narrative: "You should switch to Northwind Goods because it is the best option for you.", questions: ["Why not switch?", "What is stopping you?"] },
      "Amazon", 140, scenarios,
    );
    expect(advice.source).toBe("template");
    const invented = verifyTradeoff(
      { narrative: "Northwind Goods would save you $77 a month compared with what you pay now.", questions: ["How does that feel?", "What else matters?"] },
      "Amazon", 140, scenarios,
    );
    expect(invented.problems.join(" ")).toMatch(/numbers/);
  });

  it("template treats keeping as legitimate and works with no alternatives", () => {
    expect(templateTradeoff("Amazon", 140, scenarios).narrative).toMatch(/keeping it as is/);
    expect(templateTradeoff("Maple", 27, []).narrative).toMatch(/keeping things as they are/);
  });
});
