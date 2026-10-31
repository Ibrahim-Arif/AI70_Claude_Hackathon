import { NextResponse } from "next/server";
import { complete, extractJson, hasKey } from "@/lib/ai/claude";
import { PARSE_SYSTEM } from "@/lib/ai/prompts";
import { ParseInputSchema, ParseOutputSchema, type ParseResponse } from "@/lib/ai/schemas";
import { DECLINED_MESSAGE, FAILED, isIdentityAvoidance, scriptedParse } from "@/lib/ai/scripted";

export const runtime = "nodejs";

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

export async function POST(req: Request) {
  let input;
  try {
    input = ParseInputSchema.parse(await req.json());
  } catch {
    return NextResponse.json(FAILED, { status: 200 });
  }
  const { text, history, mode } = input;

  // Hard guard, regardless of mode: never filter businesses by who owns them.
  if (isIdentityAvoidance(text)) {
    return NextResponse.json({ status: "declined", message: DECLINED_MESSAGE, source: "rule" });
  }

  const scripted = (): ParseResponse => scriptedParse(text, history) ?? FAILED;

  if (mode === "scripted" || !hasKey()) {
    return NextResponse.json({ ...scripted(), source: "scripted" });
  }

  try {
    const raw = await complete(PARSE_SYSTEM, JSON.stringify({ text, history }));
    const parsed = ParseOutputSchema.parse(extractJson(raw));
    // Max 2 clarify turns, then the model must return a result.
    if (parsed.status === "clarify" && history.length >= 2) throw new Error("too many clarifications");
    if (parsed.status === "clarify") {
      return NextResponse.json({ ...parsed, source: "live" });
    }
    if (parsed.status === "result") {
      const preference = {
        ...parsed.preference,
        id: `custom-${slug(parsed.preference.label)}`,
        sourceText: text,
        clarifications: history,
      };
      return NextResponse.json({ ...parsed, preference, source: "live" });
    }
    return NextResponse.json({ ...parsed, source: "live" });
  } catch {
    // Timeout, API error, invalid JSON or failed validation: fall back silently.
    return NextResponse.json({ ...scripted(), source: "fallback" });
  }
}
