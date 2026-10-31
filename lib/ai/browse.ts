import { z } from "zod";
import { alternatives } from "@/data/alternatives";
import { merchants } from "@/data/merchants";

export const KNOWN_TAGS = Array.from(
  new Set([...merchants.flatMap((m) => m.tags), ...alternatives.flatMap((a) => a.tags)]),
).sort();

export const BrowseOutputSchema = z.object({
  tags: z.array(z.string()).max(6),
  summary: z.string().min(3).max(160),
});
export type BrowseIntent = { tags: string[]; summary: string; source: "live" | "scripted" | "none" };

const KEYWORDS: [RegExp, string[], string][] = [
  [/coffee|cafe|latte/, ["coffee"], "coffee"],
  [/grocer|food shop|supermarket|produce/, ["grocery"], "groceries"],
  [/cloth|fashion|shirt|jeans|wear|apparel/, ["clothing"], "clothing"],
  [/second ?hand|thrift|used/, ["secondhand"], "secondhand"],
  [/gas|fuel|petrol/, ["fuel"], "fuel"],
  [/ride|taxi|transit|commut/, ["rideshare"], "getting around"],
  [/stream|movies?|music|subscription/, ["streaming", "subscription"], "streaming"],
  [/local|neighbo|small business/, ["local"], "local businesses"],
  [/restaurant|dinner|lunch|eat out|takeout/, ["restaurant", "fast_casual", "fast_food"], "eating out"],
  [/online|shop|buy/, ["online_retail", "general_retail"], "shopping"],
  [/pharmac|drug/, ["pharmacy"], "pharmacy"],
];

/** Offline fallback: keyword to tag. Never invents tags. */
export function scriptedBrowse(query: string): BrowseIntent {
  const q = query.toLowerCase();
  const hits = KEYWORDS.filter(([re]) => re.test(q));
  if (hits.length === 0) return { tags: [], summary: "We couldn't match that to a category yet.", source: "none" };
  return {
    tags: Array.from(new Set(hits.flatMap(([, t]) => t))).filter((t) => KNOWN_TAGS.includes(t)),
    summary: `Showing ${hits.map(([, , w]) => w).join(" and ")}, checked against your values.`,
    source: "scripted",
  };
}

export function verifyBrowse(raw: unknown, query: string): BrowseIntent {
  const parsed = BrowseOutputSchema.safeParse(raw);
  if (!parsed.success) return scriptedBrowse(query);
  const tags = parsed.data.tags.filter((t) => KNOWN_TAGS.includes(t));
  if (tags.length === 0) return scriptedBrowse(query);
  if (/—/.test(parsed.data.summary)) return { ...scriptedBrowse(query), tags };
  return { tags, summary: parsed.data.summary, source: "live" };
}
