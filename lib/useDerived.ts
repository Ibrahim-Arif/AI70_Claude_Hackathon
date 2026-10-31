"use client";

import { useMemo } from "react";
import { merchantById, merchants } from "@/data/merchants";
import { transactions } from "@/data/transactions";
import { flags, label, ratedCoverage, spendByMerchant, summarize, type LabelResult } from "./engine";
import { useApp, useProfile } from "./store";

const SPEND = spendByMerchant(transactions);

export function useDerived() {
  const profile = useProfile();
  const kept = useApp((s) => s.kept);
  const mode = useApp((s) => s.mode);

  return useMemo(() => {
    const summary = summarize(transactions, merchantById, profile);
    const results: Record<string, LabelResult> = Object.fromEntries(
      merchants.map((m) => [m.id, label(m, profile)]),
    );
    const flagIds = flags(transactions, merchantById, profile, kept);
    const rows = merchants
      .filter((m) => SPEND[m.id])
      .map((m) => ({ merchant: m, spend: SPEND[m.id], result: results[m.id] }))
      .sort((a, b) => b.spend - a.spend);
    const coverage = ratedCoverage(transactions, merchantById);
    const generic = mode === "generic" || profile.preferences.length === 0;
    return { profile, summary, results, flagIds, rows, coverage, generic, spend: SPEND, kept };
  }, [profile, kept, mode]);
}
