import type { Transaction } from "@/lib/types";
import { transactions } from "./transactions";

/**
 * Illustrative estimates of kg CO2e per dollar spent, by merchant. Spend-based
 * factors are rough by nature. Replace with a sourced dataset before relying on them.
 */
export const KG_PER_USD: Record<string, number> = {
  shell: 2.4, uber: 0.45, mcdonalds: 0.9, starbucks: 0.55, amazon: 0.35, wholefoods: 0.8,
  hm: 0.6, patagonia: 0.35, traderjoes: 0.8, costco: 0.8, target: 0.4, cvs: 0.3,
  chipotle: 0.9, bluebottle: 0.55, netflix: 0.05, spotify: 0.04, coop: 0.7,
  maple: 0.6, juniperthai: 0.8, riverside: 0.1, parking: 0.2,
};

export const co2eOf = (t: Pick<Transaction, "merchantId" | "amount" | "excluded">): number =>
  t.excluded || !t.merchantId ? 0 : Math.round(t.amount * (KG_PER_USD[t.merchantId] ?? 0.4) * 10) / 10;

export function totalCo2e(txs: Transaction[] = transactions): number {
  return Math.round(txs.reduce((s, t) => s + co2eOf(t), 0));
}

export function dailyCumulativeCo2e(txs: Transaction[] = transactions): number[] {
  const perDay = new Array(30).fill(0);
  for (const t of txs) perDay[Number(t.date.slice(8, 10)) - 1] += co2eOf(t);
  let run = 0;
  return perDay.map((v) => (run += v));
}

/** Illustrative September comparison curve ending at `end`, with plausible day-to-day texture. */
export function priorMonthCurve(end: number): number[] {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const steps = Array.from({ length: 30 }, () => (rnd() < 0.55 ? rnd() * rnd() * 3.2 : 0));
  const sum = steps.reduce((a, b) => a + b, 0) || 1;
  let run = 0;
  return steps.map((s) => (run += (s / sum) * end));
}
