import type { Alternative, Issue, Rating } from "@/lib/types";

function ratings(slug: string, climate: number, labor: number, governance: number): Rating[] {
  const mk = (issue: Issue, score: number, source: string, date: string): Rating => ({
    issue,
    score,
    source,
    date,
    scope: "merchant",
    url: `https://example.com/ratings/${issue}/${slug}`,
  });
  return [
    mk("climate", climate, "Illustrative Climate Index", "2026-03"),
    mk("labor", labor, "Illustrative Labor Index", "2026-04"),
    mk("governance", governance, "Illustrative Governance Index", "2026-01"),
  ];
}

/** Fictional, illustrative alternatives. */
export const alternatives: Alternative[] = [
  { forMerchantId: "amazon", name: "Northwind Goods", availability: "online", priceDeltaPct: 4, tags: ["online_retail"], ratings: ratings("northwind", 70, 75, 66) },
  { forMerchantId: "amazon", name: "Harbor & Co.", availability: "online", priceDeltaPct: 9, tags: ["online_retail"], ratings: ratings("harbor", 72, 78, 70) },
  { forMerchantId: "wholefoods", name: "Riverbend Market", availability: "regional", priceDeltaPct: 3, tags: ["grocery"], ratings: ratings("riverbend", 66, 70, 64) },
  { forMerchantId: "mcdonalds", name: "Green Plate Kitchen", availability: "regional", priceDeltaPct: 2, tags: ["restaurant"], ratings: ratings("greenplate", 64, 68, 62) },
  { forMerchantId: "shell", name: "Evergreen Fuel Co-op", availability: "regional", priceDeltaPct: 8, tags: ["fuel"], ratings: ratings("evergreen", 61, 70, 65) },
  { forMerchantId: "hm", name: "Thread Second", availability: "online", priceDeltaPct: -20, tags: ["clothing", "secondhand"], ratings: ratings("threadsecond", 80, 66, 63) },
  { forMerchantId: "uber", name: "Valley Transit", availability: "regional", priceDeltaPct: -60, tags: ["transit"], ratings: ratings("valleytransit", 82, 70, 72) },
];
