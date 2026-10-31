import { NextResponse } from "next/server";
import { z } from "zod";
import { KNOWN_TAGS, scriptedBrowse, verifyBrowse } from "@/lib/ai/browse";
import { complete, extractJson, hasKey } from "@/lib/ai/claude";
import { BROWSE_SYSTEM } from "@/lib/ai/prompts";

export const runtime = "nodejs";

const Input = z.object({ query: z.string().min(1).max(200), mode: z.enum(["live", "scripted"]).default("live") });

export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const { query, mode } = parsed.data;
  let intent = scriptedBrowse(query);
  if (mode === "live" && hasKey()) {
    try {
      intent = verifyBrowse(extractJson(await complete(BROWSE_SYSTEM(KNOWN_TAGS), JSON.stringify({ request: query }), 300)), query);
    } catch {
      // keep scripted
    }
  }
  return NextResponse.json(intent);
}
