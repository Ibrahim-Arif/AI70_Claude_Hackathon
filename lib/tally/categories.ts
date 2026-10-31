import type { Merchant } from "@/lib/types";

const RULES: [string, string[]][] = [
  ["Coffee", ["coffee"]],
  ["Dining out", ["fast_food", "fast_casual", "restaurant", "bakery"]],
  ["Groceries", ["grocery"]],
  ["Subscriptions", ["subscription"]],
  ["Shopping", ["clothing", "online_retail", "general_retail"]],
  ["Getting around", ["rideshare", "fuel", "parking"]],
  ["Health", ["pharmacy"]],
];

export const categoryOf = (m: Merchant): string => RULES.find(([, tags]) => m.tags.some((t) => tags.includes(t)))?.[0] ?? "Other";

/** Needs, not habits. Tally never proposes cutting these. */
export const ESSENTIAL = new Set(["Groceries", "Health"]);

/** Largest share of a category Tally will propose trimming. Subscriptions are reviewed, not trimmed. */
export const CUT_CAP: Record<string, number> = { Coffee: 0.25, "Dining out": 0.25, Shopping: 0.2, "Getting around": 0.15, Other: 0.2 };

/** Order Tally looks at habits when building a plan: small, frequent purchases first. */
export const PLAN_ORDER = ["Coffee", "Dining out", "Getting around", "Shopping", "Other"];

export const MIN_CATEGORY_SPEND = 60;
