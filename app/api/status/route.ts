import { NextResponse } from "next/server";
import { hasKey } from "@/lib/ai/claude";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    hasKey: hasKey(),
    model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
  });
}
