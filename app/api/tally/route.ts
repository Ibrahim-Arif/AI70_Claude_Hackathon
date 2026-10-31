import { NextResponse } from "next/server";
import { z } from "zod";
import { complete, extractJson, hasKey } from "@/lib/ai/claude";
import { TALLY_INTENT_SYSTEM, TALLY_NARRATE_SYSTEM } from "@/lib/ai/prompts";
import { IntentSchema, buildAnswer, scriptedIntent, templateNarrative, verifyNarrative } from "@/lib/ai/tally";
import type { Ctx } from "@/lib/tally/types";

export const runtime = "nodejs";

const Input = z.object({
  message: z.string().min(1).max(300),
  mode: z.enum(["live", "scripted"]).default("live"),
  ctx: z.custom<Ctx>((v) => typeof v === "object" && v !== null && typeof (v as Ctx).budget === "number" && Array.isArray((v as Ctx).dismissed)),
});

export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const { message, mode, ctx } = parsed.data;
  const live = mode === "live" && hasKey();

  let intent = scriptedIntent(message);
  let source: "live" | "scripted" = "scripted";
  if (live) {
    try {
      const r = IntentSchema.safeParse(extractJson(await complete(TALLY_INTENT_SYSTEM, JSON.stringify({ request: message }), 150)));
      if (r.success) {
        intent = r.data;
        source = "live";
      }
    } catch {
      // keep scripted
    }
  }

  // Numbers, plan and proposals are computed here, never by the model.
  const answer = buildAnswer(intent, ctx);
  let narrative = templateNarrative(answer);
  if (live) {
    try {
      narrative = verifyNarrative(extractJson(await complete(TALLY_NARRATE_SYSTEM, JSON.stringify(answer), 250)), answer);
    } catch {
      // keep template
    }
  }
  return NextResponse.json({ intent, answer, narrative, source });
}
