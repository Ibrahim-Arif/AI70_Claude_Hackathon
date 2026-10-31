"use client";

import { useMemo } from "react";
import { useApp, useProfile } from "@/lib/store";
import type { Ctx } from "@/lib/tally/types";

export function useTallyCtx(): Ctx {
  const profile = useProfile();
  const targets = useApp((s) => s.targets);
  const reviewList = useApp((s) => s.reviewList);
  const consideration = useApp((s) => s.consideration);
  const decisions = useApp((s) => s.decisions);
  const dismissed = useApp((s) => s.dismissed);
  const kept = useApp((s) => s.kept);
  const budget = useApp((s) => s.budget);
  return useMemo(
    () => ({ profile, targets, reviewList, consideration, decisions, dismissed, kept, budget }),
    [profile, targets, reviewList, consideration, decisions, dismissed, kept, budget],
  );
}
