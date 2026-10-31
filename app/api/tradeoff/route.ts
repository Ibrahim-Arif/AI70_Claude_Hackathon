import { NextResponse } from "next/server";
import { z } from "zod";
import { alternatives } from "@/data/alternatives";
import { merchantById } from "@/data/merchants";
import { complete, extractJson, hasKey } from "@/lib/ai/claude";
import { TRADEOFF_SYSTEM } from "@/lib/ai/prompts";
import { templateTradeoff, verifyTradeoff } from "@/lib/ai/tradeoff";
import { exploreTradeoff } from "@/lib/engine";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";

const Input = z.object({
  merchantId: z.string(),
  monthlySpend: z.number().min(0).max(100000),
  mode: z.enum(["live", "scripted"]).default("live"),
  profile: z.custom<Profile>((v) => typeof v === "object" && v !== null && Array.isArray((v as Profile).preferences)),
});

export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  const merchant = parsed.success ? merchantById[parsed.data.merchantId] : undefined;
  if (!parsed.success || !merchant) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const { monthlySpend, mode, profile } = parsed.data;

  // Numbers and fit are computed by the engine. The model only narrates them.
  const scenarios = exploreTradeoff(merchant, monthlySpend, alternatives, profile);
  let narration = templateTradeoff(merchant.name, monthlySpend, scenarios);

  if (mode === "live" && hasKey() && scenarios.length > 0) {
    try {
      const payload = {
        merchant: merchant.name,
        monthlySpend,
        values: profile.preferences.map((p) => ({ value: p.label, importance: p.importance })),
        budgetPct: profile.maxPriceIncreasePct,
        scenarios: scenarios.map((s) => ({
          name: s.alternative.name,
          monthlyCostChange: s.monthlyCostDelta,
          priceChangePct: s.alternative.priceDeltaPct,
          withinBudget: s.withinBudget,
          label: s.label,
          meets: s.improvesOn,
        })),
      };
      narration = verifyTradeoff(extractJson(await complete(TRADEOFF_SYSTEM, JSON.stringify(payload), 600)), merchant.name, monthlySpend, scenarios);
    } catch {
      // keep the template
    }
  }
  return NextResponse.json({ scenarios, ...narration });
}
