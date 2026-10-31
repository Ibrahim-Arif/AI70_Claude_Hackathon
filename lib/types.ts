export type Issue = "climate" | "labor" | "governance" | "political" | "privacy";
export type Importance = "nice" | "important" | "dealbreaker";

export type Rating = {
  issue: Issue;
  score: number;
  source: string;
  /** YYYY-MM */
  date: string;
  scope: "merchant" | "parent";
  url: string;
};

export type Merchant = {
  id: string;
  name: string;
  parentId: string;
  category: string;
  tags: string[];
  ratings: Rating[];
};

export type Parent = { id: string; name: string };

export type Transaction = {
  id: string;
  date: string;
  rawName: string;
  amount: number;
  merchantId?: string;
  excluded?: boolean;
};

export type PreferenceRule =
  | { kind: "rating"; issue: Issue }
  /** alsoTags: extra tags that count as a match (e.g. fast casual when the user says it counts) */
  | { kind: "attribute"; tag: string; polarity: "avoid" | "prefer"; alsoTags?: string[] }
  | { kind: "entity"; parentId: string; polarity: "avoid" };

export type Preference = {
  id: string;
  label: string;
  sourceText?: string;
  type: "rating" | "attribute" | "entity" | "unsupported";
  rule?: PreferenceRule;
  importance: Importance;
  clarifications?: { q: string; a: string }[];
};

export type PriceBudget = 0 | 5 | 10 | 20;

export type Profile = {
  name: string;
  preferences: Preference[];
  maxPriceIncreasePct: PriceBudget;
};

export type Alternative = {
  forMerchantId: string;
  name: string;
  availability: "national" | "regional" | "online";
  priceDeltaPct: number;
  tags: string[];
  ratings: Rating[];
};

export type Goal = {
  id: string;
  label: string;
  merchantIds: string[];
  baseline: number;
  target: number;
};

export type Label = "Aligned" | "Mixed" | "Conflicts" | "Unknown";
export type Evaluation = "pass" | "fail" | "unknown" | "na";
export type GenericSummary = "Unrated" | "Weak" | "Strong" | "Mixed";
