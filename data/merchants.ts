import type { Issue, Merchant, Parent, Rating } from "@/lib/types";

const SOURCES: Record<Issue, string> = {
  climate: "Illustrative Climate Index",
  labor: "Illustrative Labor Index",
  governance: "Illustrative Governance Index",
  political: "Illustrative Political Spending Index",
  privacy: "Illustrative Privacy Index",
};

function r(
  merchantId: string,
  issue: Issue,
  score: number,
  date: string,
  scope: Rating["scope"] = "merchant",
): Rating {
  return {
    issue,
    score,
    source: SOURCES[issue],
    date,
    scope,
    url: `https://example.com/ratings/${issue}/${merchantId}`,
  };
}

export const parents: Parent[] = [
  { id: "amazon", name: "Amazon" },
  { id: "mcdonalds", name: "McDonald's" },
  { id: "shell", name: "Shell plc" },
  { id: "hm", name: "H&M" },
  { id: "uber", name: "Uber" },
  { id: "traderjoes", name: "Trader Joe's" },
  { id: "costco", name: "Costco" },
  { id: "target", name: "Target" },
  { id: "patagonia", name: "Patagonia" },
  { id: "starbucks", name: "Starbucks" },
  { id: "cvs", name: "CVS" },
  { id: "chipotle", name: "Chipotle" },
  { id: "nestle", name: "Nestlé" },
  { id: "netflix", name: "Netflix" },
  { id: "spotify", name: "Spotify" },
  { id: "coop", name: "Upper Valley Co-op" },
  { id: "maple", name: "Maple Street Bakery" },
  { id: "juniperthai", name: "Juniper Thai Kitchen" },
  { id: "riverside", name: "Riverside Fitness" },
  { id: "parking", name: "City Parking" },
];

/*
  Ratings are designed so every tracked value has a spread of outcomes:
  at least one merchant falls far short (< 30, Conflicts at Important),
  several fall short (30 to 49, Mixed), and the rest pass (>= 50).

  climate    far: Shell 22 (stale)      short: H&M 45, Uber 44
  labor      far: H&M 27                short: Amazon/Whole Foods 38, McDonald's 41, Starbucks 46
  political  far: Shell 26              short: Amazon/Whole Foods 44, McDonald's 47, Target 48
  privacy    far: Amazon/Whole Foods 24 short: Uber 31, CVS 38, Spotify 42
  Blue Bottle has no political or privacy rating (Unknown when those matter).
  Local merchants and City Parking have no ratings at all.
*/
type Row = {
  id: string;
  name: string;
  parentId: string;
  category: string;
  tags: string[];
  // [score, YYYY-MM, scope?]
  climate?: [number, string, Rating["scope"]?];
  labor?: [number, string, Rating["scope"]?];
  governance?: [number, string, Rating["scope"]?];
  political?: [number, string, Rating["scope"]?];
  privacy?: [number, string, Rating["scope"]?];
};

const ROWS: Row[] = [
  {
    id: "amazon", name: "Amazon", parentId: "amazon", category: "Online retail", tags: ["online_retail"],
    climate: [55, "2026-02"], labor: [38, "2026-03", "parent"], governance: [58, "2025-12", "parent"],
    political: [44, "2026-01", "parent"], privacy: [24, "2026-04", "parent"],
  },
  {
    id: "wholefoods", name: "Whole Foods", parentId: "amazon", category: "Grocery", tags: ["grocery"],
    climate: [58, "2026-02"], labor: [38, "2026-03", "parent"], governance: [58, "2025-12", "parent"],
    political: [44, "2026-01", "parent"], privacy: [24, "2026-04", "parent"],
  },
  {
    id: "mcdonalds", name: "McDonald's", parentId: "mcdonalds", category: "Fast food", tags: ["fast_food"],
    climate: [52, "2026-01"], labor: [41, "2026-04"], governance: [61, "2025-11"],
    political: [47, "2026-02"], privacy: [55, "2026-03"],
  },
  {
    id: "shell", name: "Shell", parentId: "shell", category: "Fuel", tags: ["fuel"],
    climate: [22, "2024-11"], labor: [60, "2026-02"], governance: [54, "2025-10"],
    political: [26, "2026-03"], privacy: [60, "2026-01"],
  },
  {
    id: "hm", name: "H&M", parentId: "hm", category: "Clothing", tags: ["clothing", "fast_fashion"],
    climate: [45, "2026-03"], labor: [27, "2026-01"], governance: [63, "2025-12"],
    political: [58, "2026-02"], privacy: [62, "2026-02"],
  },
  {
    id: "uber", name: "Uber", parentId: "uber", category: "Rideshare", tags: ["rideshare"],
    climate: [44, "2026-02"], labor: [52, "2026-05"], governance: [49, "2026-01"],
    political: [55, "2026-03"], privacy: [31, "2026-04"],
  },
  {
    id: "traderjoes", name: "Trader Joe's", parentId: "traderjoes", category: "Grocery", tags: ["grocery"],
    climate: [60, "2026-01"], labor: [63, "2026-03"], governance: [66, "2025-11"],
    political: [62, "2026-02"], privacy: [70, "2026-01"],
  },
  {
    id: "costco", name: "Costco", parentId: "costco", category: "Grocery", tags: ["grocery"],
    climate: [57, "2026-02"], labor: [72, "2026-04"], governance: [71, "2025-12"],
    political: [60, "2026-01"], privacy: [66, "2026-03"],
  },
  {
    id: "target", name: "Target", parentId: "target", category: "General retail", tags: ["general_retail"],
    climate: [58, "2026-03"], labor: [54, "2026-02"], governance: [62, "2026-01"],
    political: [48, "2026-02"], privacy: [52, "2026-04"],
  },
  {
    id: "patagonia", name: "Patagonia", parentId: "patagonia", category: "Clothing", tags: ["clothing"],
    climate: [85, "2026-04"], labor: [80, "2026-02"], governance: [75, "2026-01"],
    political: [70, "2026-03"], privacy: [78, "2026-02"],
  },
  {
    id: "starbucks", name: "Starbucks", parentId: "starbucks", category: "Coffee", tags: ["coffee"],
    climate: [62, "2026-01"], labor: [46, "2026-05"], governance: [57, "2025-12"],
    political: [57, "2026-02"], privacy: [50, "2026-03"],
  },
  {
    id: "cvs", name: "CVS", parentId: "cvs", category: "Pharmacy", tags: ["pharmacy"],
    climate: [54, "2026-02"], labor: [56, "2026-03"], governance: [52, "2025-11"],
    political: [51, "2026-01"], privacy: [38, "2026-04"],
  },
  {
    id: "chipotle", name: "Chipotle", parentId: "chipotle", category: "Fast casual", tags: ["fast_casual"],
    climate: [56, "2026-03"], labor: [51, "2026-02"], governance: [60, "2025-12"],
    political: [63, "2026-02"], privacy: [61, "2026-01"],
  },
  {
    id: "bluebottle", name: "Blue Bottle Coffee", parentId: "nestle", category: "Coffee", tags: ["coffee"],
    climate: [52, "2026-01", "parent"], labor: [50, "2026-02", "parent"], governance: [47, "2025-12", "parent"],
  },
  {
    id: "netflix", name: "Netflix", parentId: "netflix", category: "Streaming", tags: ["streaming", "subscription"],
    climate: [70, "2026-02"], labor: [65, "2026-01"], governance: [68, "2025-12"],
    political: [66, "2026-03"], privacy: [58, "2026-02"],
  },
  {
    id: "spotify", name: "Spotify", parentId: "spotify", category: "Streaming", tags: ["streaming", "subscription"],
    climate: [68, "2026-03"], labor: [60, "2026-02"], governance: [64, "2026-01"],
    political: [64, "2026-02"], privacy: [42, "2026-04"],
  },
  { id: "coop", name: "Upper Valley Co-op", parentId: "coop", category: "Grocery", tags: ["grocery", "local"] },
  { id: "maple", name: "Maple Street Bakery", parentId: "maple", category: "Bakery", tags: ["bakery", "local"] },
  { id: "juniperthai", name: "Juniper Thai Kitchen", parentId: "juniperthai", category: "Restaurant", tags: ["restaurant", "local"] },
  { id: "riverside", name: "Riverside Fitness", parentId: "riverside", category: "Fitness", tags: ["fitness", "local"] },
  { id: "parking", name: "City Parking", parentId: "parking", category: "Parking", tags: ["parking"] },
];

const ISSUE_ORDER: Issue[] = ["climate", "labor", "governance", "political", "privacy"];

export const merchants: Merchant[] = ROWS.map((row) => ({
  id: row.id,
  name: row.name,
  parentId: row.parentId,
  category: row.category,
  tags: row.tags,
  ratings: ISSUE_ORDER.flatMap((issue) => {
    const v = row[issue];
    return v ? [r(row.id, issue, v[0], v[1], v[2] ?? "merchant")] : [];
  }),
}));

export const merchantById: Record<string, Merchant> = Object.fromEntries(
  merchants.map((m) => [m.id, m]),
);

export const parentById: Record<string, Parent> = Object.fromEntries(
  parents.map((p) => [p.id, p]),
);

export function parentName(m: Merchant): string {
  return parentById[m.parentId]?.name ?? m.name;
}

/** True when a merchant is owned by a different company (show "Owned by X"). */
export function hasDifferentParent(m: Merchant): boolean {
  return m.parentId !== m.id;
}
