import { NextResponse } from "next/server";
import { complete, extractJson, hasKey } from "@/lib/ai/claude";
import { RESEARCH_SYSTEM } from "@/lib/ai/prompts";
import { ExplainInputSchema } from "@/lib/ai/schemas";
import { fmtDate } from "@/lib/ai/explainTemplate";
import { templateResearch, verifyResearch, type Research } from "@/lib/ai/research";

export const runtime = "nodejs";

const cache = new Map<string, Research>();

export async function POST(req: Request) {
  const parsed = ExplainInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const input = parsed.data;

  const key = `${input.mode}:${input.cacheKey}`;
  const hit = cache.get(key);
  if (hit) return NextResponse.json(hit);

  let out: Research = templateResearch(input);
  if (input.mode === "live" && hasKey() && input.ratings.length > 0) {
    try {
      const payload = {
        merchant: input.merchant,
        label: input.label,
        values: input.profile.preferences,
        reasons: input.reasons.map((r) => ({ value: r.label, importance: r.importance, severe: !!r.severe })),
        ratings: input.ratings.map((r) => ({ issue: r.issue, score: r.score, source: r.source, date: fmtDate(r.date), scope: r.scope })),
      };
      out = verifyResearch(extractJson(await complete(RESEARCH_SYSTEM, JSON.stringify(payload), 700)), input);
    } catch {
      // keep the template
    }
  }
  cache.set(key, out);
  return NextResponse.json(out);
}
