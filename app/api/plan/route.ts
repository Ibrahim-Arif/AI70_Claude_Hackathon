import { NextResponse } from "next/server";
import { z } from "zod";
import { alternatives } from "@/data/alternatives";
import { merchantById } from "@/data/merchants";
import { transactions } from "@/data/transactions";
import { complete, extractJson, hasKey } from "@/lib/ai/claude";
import { templatePlan, verifyPlan } from "@/lib/ai/plan";
import { PLAN_SYSTEM } from "@/lib/ai/prompts";
import { alignmentOptions } from "@/lib/engine";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";

const Input = z.object({
  mode: z.enum(["live", "scripted"]).default("live"),
  kept: z.array(z.string()).default([]),
  profile: z.custom<Profile>((v) => typeof v === "object" && v !== null && Array.isArray((v as Profile).preferences)),
});

export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const { profile, kept, mode } = parsed.data;

  // Options and numbers come from the rules engine. The model only describes them.
  const { pctNow, options } = alignmentOptions(transactions, merchantById, alternatives, profile, kept);
  const names = Object.fromEntries(options.map((o) => [o.merchantId, merchantById[o.merchantId].name]));
  let narration = templatePlan(pctNow, options, names);

  if (mode === "live" && hasKey() && options.length > 0) {
    try {
      const payload = {
        alignmentNow: pctNow,
        options: options.map((o) => ({
          merchant: names[o.merchantId],
          alternative: o.alternative.name,
          monthlySpendMoved: o.spend,
          monthlyCostChange: o.monthlyCostDelta,
          alignmentAfter: o.pctAfter,
        })),
      };
      narration = verifyPlan(extractJson(await complete(PLAN_SYSTEM, JSON.stringify(payload), 500)), pctNow, options, names);
    } catch {
      // keep the template
    }
  }
  return NextResponse.json({ pctNow, options, ...narration });
}
