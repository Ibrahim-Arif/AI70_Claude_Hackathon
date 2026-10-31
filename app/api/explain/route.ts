import { NextResponse } from "next/server";
import { complete, hasKey } from "@/lib/ai/claude";
import { EXPLAIN_SYSTEM } from "@/lib/ai/prompts";
import { ExplainInputSchema } from "@/lib/ai/schemas";
import { UNKNOWN_EXPLANATION } from "@/lib/ai/scripted";
import { fmtDate, isValidExplanation, templateExplain } from "@/lib/ai/explainTemplate";

export const runtime = "nodejs";

// Per-instance cache: merchant + profile hash → text
const cache = new Map<string, { text: string; source: string }>();

export async function POST(req: Request) {
  const parsed = ExplainInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ text: UNKNOWN_EXPLANATION, source: "template" });
  const input = parsed.data;

  // Unknown merchants never go to the AI.
  if (input.label === "Unknown" || input.ratings.length === 0) {
    return NextResponse.json({ text: UNKNOWN_EXPLANATION, source: "fixed" });
  }

  const key = `${input.mode}:${input.cacheKey}`;
  const hit = cache.get(key);
  if (hit) return NextResponse.json({ ...hit, cached: true });

  const template = templateExplain(input);
  let out = { text: template, source: "template" };

  if (input.mode === "live" && hasKey()) {
    try {
      const payload = {
        merchant: input.merchant,
        label: input.label,
        reasons: input.reasons.map((r) => ({ value: r.label, importance: r.importance, severe: !!r.severe })),
        notes: input.notes.map((r) => ({ value: r.label, importance: r.importance })),
        ratings: input.ratings.map((r) => ({ ...r, date: fmtDate(r.date), url: undefined })),
      };
      const text = (await complete(EXPLAIN_SYSTEM, JSON.stringify(payload), 400)).replace(/\s+/g, " ").trim();
      if (isValidExplanation(text, input)) out = { text, source: "live" };
    } catch {
      // fall through to template
    }
  }

  cache.set(key, out);
  return NextResponse.json(out);
}
