import type { Profile } from "@/lib/types";

export type ActionType = "set_target" | "review_subscriptions" | "add_to_consideration" | "set_monthly_budget";

/**
 * A proposed change. The model may help word it, but every number comes from
 * lib/tally/analysis.ts and every proposal is validated before it can run.
 */
export type ActionProposal = {
  id: string;
  type: ActionType;
  description: string;
  category?: string;
  merchantId?: string;
  /** Name of the alternative, for add_to_consideration. */
  altName?: string;
  current: number | null;
  proposed: number | null;
  /** Estimated monthly effect in dollars. Positive saves money, negative costs more. null when not calculable. */
  impact: number | null;
  explanation: string;
  /** What we can't know. Required for anything that depends on missing information. */
  uncertainty?: string;
  requiresApproval: true;
};

export type Target = { amount: number; savings: number; createdAt: string; source: string };
export type Decision = { id: string; at: string; status: "approved" | "dismissed"; kind: string; summary: string };
export type ConsiderationItem = { merchantId: string; alt: string };

export type TallyState = {
  targets: Record<string, Target>;
  reviewList: string[];
  consideration: ConsiderationItem[];
  decisions: Decision[];
  dismissed: string[];
};

export const emptyTallyState: TallyState = { targets: {}, reviewList: [], consideration: [], decisions: [], dismissed: [] };

export type Ctx = TallyState & { profile: Profile; kept: string[]; budget: number };

export type Insight = { id: string; text: string };

export type Opportunity = {
  id: string;
  kind: "target" | "subscriptions" | "values";
  headline: string;
  why: string;
  /** Monthly dollars. Positive saves. null when not calculable. */
  impact: number | null;
  valuesNote?: string;
  uncertainty?: string;
  primary: ActionProposal;
  /** Opens the evidence or comparison instead of committing anything. */
  secondary?: { label: string; merchantId: string };
  score: number;
};

export type SavingsPlan = {
  id: string;
  objective: number;
  items: ActionProposal[];
  /** Savings from targets the person would set. */
  committed: number;
  /** Savings that depend on a review turning something up. */
  potential: number;
  shortfall: number;
  tradeoffs: string[];
};
