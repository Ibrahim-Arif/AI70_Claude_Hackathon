import type { Issue, Merchant, Parent, Rating } from "@/lib/types";

const SOURCES: Record<Issue, string> = {
  climate: "Illustrative Climate Index",
  labor: "Illustrative Labor Index",
  governance: "Illustrative Governance Index",
  political: "Illustrative Political Spending Index",
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

export const merchants: Merchant[] = [
  {
    id: "amazon",
    name: "Amazon",
    parentId: "amazon",
    category: "Online retail",
    tags: ["online_retail"],
    ratings: [
      r("amazon", "climate", 55, "2026-02"),
      r("amazon", "labor", 32, "2026-03", "parent"),
      r("amazon", "governance", 58, "2025-12", "parent"),
    ],
  },
  {
    id: "wholefoods",
    name: "Whole Foods",
    parentId: "amazon",
    category: "Grocery",
    tags: ["grocery"],
    ratings: [
      r("wholefoods", "climate", 58, "2026-02"),
      r("wholefoods", "labor", 32, "2026-03", "parent"),
      r("wholefoods", "governance", 58, "2025-12", "parent"),
    ],
  },
  {
    id: "mcdonalds",
    name: "McDonald's",
    parentId: "mcdonalds",
    category: "Fast food",
    tags: ["fast_food"],
    ratings: [
      r("mcdonalds", "climate", 52, "2026-01"),
      r("mcdonalds", "labor", 41, "2026-04"),
      r("mcdonalds", "governance", 61, "2025-11"),
    ],
  },
  {
    id: "shell",
    name: "Shell",
    parentId: "shell",
    category: "Fuel",
    tags: ["fuel"],
    ratings: [
      r("shell", "climate", 28, "2024-11"),
      r("shell", "labor", 60, "2026-02"),
      r("shell", "governance", 54, "2025-10"),
    ],
  },
  {
    id: "hm",
    name: "H&M",
    parentId: "hm",
    category: "Clothing",
    tags: ["clothing"],
    ratings: [
      r("hm", "climate", 45, "2026-03"),
      r("hm", "labor", 55, "2026-01"),
      r("hm", "governance", 63, "2025-12"),
    ],
  },
  {
    id: "uber",
    name: "Uber",
    parentId: "uber",
    category: "Rideshare",
    tags: ["rideshare"],
    ratings: [
      r("uber", "climate", 44, "2026-02"),
      r("uber", "labor", 52, "2026-05"),
      r("uber", "governance", 49, "2026-01"),
    ],
  },
  {
    id: "traderjoes",
    name: "Trader Joe's",
    parentId: "traderjoes",
    category: "Grocery",
    tags: ["grocery"],
    ratings: [
      r("traderjoes", "climate", 60, "2026-01"),
      r("traderjoes", "labor", 63, "2026-03"),
      r("traderjoes", "governance", 66, "2025-11"),
    ],
  },
  {
    id: "costco",
    name: "Costco",
    parentId: "costco",
    category: "Grocery",
    tags: ["grocery"],
    ratings: [
      r("costco", "climate", 57, "2026-02"),
      r("costco", "labor", 72, "2026-04"),
      r("costco", "governance", 71, "2025-12"),
    ],
  },
  {
    id: "target",
    name: "Target",
    parentId: "target",
    category: "General retail",
    tags: ["general_retail"],
    ratings: [
      r("target", "climate", 58, "2026-03"),
      r("target", "labor", 54, "2026-02"),
      r("target", "governance", 62, "2026-01"),
    ],
  },
  {
    id: "patagonia",
    name: "Patagonia",
    parentId: "patagonia",
    category: "Clothing",
    tags: ["clothing"],
    ratings: [
      r("patagonia", "climate", 85, "2026-04"),
      r("patagonia", "labor", 80, "2026-02"),
      r("patagonia", "governance", 75, "2026-01"),
    ],
  },
  {
    id: "starbucks",
    name: "Starbucks",
    parentId: "starbucks",
    category: "Coffee",
    tags: ["coffee"],
    ratings: [
      r("starbucks", "climate", 62, "2026-01"),
      r("starbucks", "labor", 52, "2026-05"),
      r("starbucks", "governance", 57, "2025-12"),
    ],
  },
  {
    id: "cvs",
    name: "CVS",
    parentId: "cvs",
    category: "Pharmacy",
    tags: ["pharmacy"],
    ratings: [
      r("cvs", "climate", 54, "2026-02"),
      r("cvs", "labor", 56, "2026-03"),
      r("cvs", "governance", 52, "2025-11"),
    ],
  },
  {
    id: "chipotle",
    name: "Chipotle",
    parentId: "chipotle",
    category: "Fast casual",
    tags: ["fast_casual"],
    ratings: [
      r("chipotle", "climate", 56, "2026-03"),
      r("chipotle", "labor", 51, "2026-02"),
      r("chipotle", "governance", 60, "2025-12"),
    ],
  },
  {
    id: "bluebottle",
    name: "Blue Bottle Coffee",
    parentId: "nestle",
    category: "Coffee",
    tags: ["coffee"],
    ratings: [
      r("bluebottle", "climate", 52, "2026-01", "parent"),
      r("bluebottle", "labor", 50, "2026-02", "parent"),
      r("bluebottle", "governance", 47, "2025-12", "parent"),
    ],
  },
  {
    id: "netflix",
    name: "Netflix",
    parentId: "netflix",
    category: "Streaming",
    tags: ["streaming", "subscription"],
    ratings: [
      r("netflix", "climate", 70, "2026-02"),
      r("netflix", "labor", 65, "2026-01"),
      r("netflix", "governance", 68, "2025-12"),
    ],
  },
  {
    id: "spotify",
    name: "Spotify",
    parentId: "spotify",
    category: "Streaming",
    tags: ["streaming", "subscription"],
    ratings: [
      r("spotify", "climate", 68, "2026-03"),
      r("spotify", "labor", 60, "2026-02"),
      r("spotify", "governance", 64, "2026-01"),
    ],
  },
  { id: "coop", name: "Upper Valley Co-op", parentId: "coop", category: "Grocery", tags: ["grocery", "local"], ratings: [] },
  { id: "maple", name: "Maple Street Bakery", parentId: "maple", category: "Bakery", tags: ["bakery", "local"], ratings: [] },
  { id: "juniperthai", name: "Juniper Thai Kitchen", parentId: "juniperthai", category: "Restaurant", tags: ["restaurant", "local"], ratings: [] },
  { id: "riverside", name: "Riverside Fitness", parentId: "riverside", category: "Fitness", tags: ["fitness", "local"], ratings: [] },
  { id: "parking", name: "City Parking", parentId: "parking", category: "Parking", tags: ["parking"], ratings: [] },
];

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
