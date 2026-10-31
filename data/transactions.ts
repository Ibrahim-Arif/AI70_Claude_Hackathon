import type { Transaction } from "@/lib/types";
import merchantMap from "./merchantMap.json";

type MapEntry = { pattern: string; merchantId: string };
const MAP = merchantMap as MapEntry[];

/** Resolve a raw bank descriptor to a merchant id using merchantMap.json. */
export function resolveMerchantId(rawName: string): string | undefined {
  const upper = rawName.toUpperCase();
  return MAP.find((e) => upper.includes(e.pattern))?.merchantId;
}

// [day of October, amount, bank descriptor]
type Row = [number, number, string];

const ROWS: Row[] = [
  // Amazon 140.00
  [2, 42.18, "AMZN MKTP US*2K4"],
  [9, 27.99, "AMZN MKTP US*7R1"],
  [17, 53.84, "AMAZON.COM*9F3QX"],
  [26, 15.99, "AMZN MKTP US*4M8"],
  // Whole Foods 73.00
  [5, 41.27, "WHOLEFDS MKT #10234"],
  [19, 31.73, "WHOLEFDS MKT #10234"],
  // McDonald's 38.00
  [3, 11.48, "MCDONALD'S F12345"],
  [14, 14.27, "MCDONALD'S F12345"],
  [24, 12.25, "MCDONALD'S F30871"],
  // Shell 96.00
  [6, 48.5, "SHELL OIL 57442"],
  [21, 47.5, "SHELL OIL 57442"],
  // H&M 112.00
  [11, 64.95, "H&M 0412 BURLINGTON"],
  [25, 47.05, "H&M 0412 BURLINGTON"],
  // Uber 88.00
  [1, 14.2, "UBER *TRIP"],
  [8, 22.85, "UBER *TRIP"],
  [13, 9.6, "UBER *TRIP"],
  [20, 18.35, "UBER *TRIP"],
  [28, 23.0, "UBER *TRIP"],
  // Trader Joe's 210.00
  [4, 68.42, "TRADER JOE S #552"],
  [15, 74.11, "TRADER JOE S #552"],
  [27, 67.47, "TRADER JOE S #552"],
  // Costco 247.52
  [7, 131.86, "COSTCO WHSE #0482"],
  [22, 115.66, "COSTCO WHSE #0482"],
  // Target 182.00
  [3, 56.37, "TARGET 00012345"],
  [16, 89.14, "TARGET 00012345"],
  [29, 36.49, "TARGET 00012345"],
  // Patagonia 120.00
  [12, 120.0, "PATAGONIA.COM"],
  // Starbucks 64.00
  [1, 6.45, "STARBUCKS STORE 08812"],
  [5, 7.15, "STARBUCKS STORE 08812"],
  [8, 5.95, "STARBUCKS STORE 08812"],
  [12, 8.4, "STARBUCKS STORE 08812"],
  [15, 6.45, "STARBUCKS STORE 08812"],
  [19, 9.85, "STARBUCKS STORE 08812"],
  [23, 12.3, "STARBUCKS STORE 08812"],
  [27, 7.45, "STARBUCKS STORE 08812"],
  // CVS 46.00
  [10, 18.79, "CVS/PHARMACY #02231"],
  [24, 27.21, "CVS/PHARMACY #02231"],
  // Chipotle 42.00
  [6, 13.85, "CHIPOTLE 1873"],
  [18, 14.4, "CHIPOTLE 1873"],
  [30, 13.75, "CHIPOTLE 1873"],
  // Blue Bottle 34.00
  [2, 6.5, "SQ *BLUE BOTTLE"],
  [9, 7.25, "SQ *BLUE BOTTLE"],
  [16, 6.5, "SQ *BLUE BOTTLE"],
  [22, 6.75, "SQ *BLUE BOTTLE"],
  [29, 7.0, "SQ *BLUE BOTTLE"],
  // Netflix 15.49
  [14, 15.49, "NETFLIX.COM"],
  // Spotify 11.99
  [18, 11.99, "SPOTIFY USA"],
  // Upper Valley Co-op 250.00
  [3, 58.2, "UPPER VALLEY CO-OP"],
  [10, 71.45, "UPPER VALLEY CO-OP"],
  [17, 63.1, "UPPER VALLEY CO-OP"],
  [25, 57.25, "UPPER VALLEY CO-OP"],
  // Maple Street Bakery 27.00
  [4, 8.75, "SQ *MAPLE STREET BAKERY"],
  [13, 9.5, "SQ *MAPLE STREET BAKERY"],
  [26, 8.75, "SQ *MAPLE STREET BAKERY"],
  // Juniper Thai 65.00
  [11, 38.4, "TST* JUNIPER THAI"],
  [23, 26.6, "TST* JUNIPER THAI"],
  // Riverside Fitness 60.00
  [1, 60.0, "RIVERSIDE FITNESS"],
  // City Parking 78.00
  [7, 18.0, "CITY PARKING METER"],
  [14, 24.0, "CITY PARKING METER"],
  [21, 12.0, "CITY PARKING METER"],
  [28, 24.0, "CITY PARKING METER"],
];

const EXCLUDED: Row[] = [
  [15, 1240.0, "CHASE CREDIT CRD AUTOPAY"],
  [20, 85.0, "VENMO TRANSFER"],
  [30, -3150.0, "ACH PAYROLL DEPOSIT"],
];

function iso(day: number) {
  return `2026-10-${String(day).padStart(2, "0")}`;
}

export const transactions: Transaction[] = [
  ...ROWS.map(([day, amount, rawName], i) => ({
    id: `t${i + 1}`,
    date: iso(day),
    rawName,
    amount,
    merchantId: resolveMerchantId(rawName),
  })),
  ...EXCLUDED.map(([day, amount, rawName], i) => ({
    id: `x${i + 1}`,
    date: iso(day),
    rawName,
    amount,
    excluded: true,
  })),
].sort((a, b) => a.date.localeCompare(b.date));

/** Cumulative daily spend for October (for the sparkline). */
export function dailyCumulative(txs: Transaction[] = transactions): number[] {
  const perDay = new Array(30).fill(0);
  for (const t of txs) {
    if (t.excluded) continue;
    const d = Number(t.date.slice(8, 10));
    perDay[d - 1] += t.amount;
  }
  let run = 0;
  return perDay.map((v) => (run += v));
}
