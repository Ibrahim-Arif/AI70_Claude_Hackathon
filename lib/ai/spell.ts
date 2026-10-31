/**
 * Small, predictable typo correction for the "Add your own" box. It only ever
 * swaps a word for a close match from Tally's own vocabulary, so "Fasr food"
 * becomes "fast food" and ordinary words are left alone.
 */
const VOCAB = [
  "fast", "food", "fashion", "amazon", "political", "politics", "donations", "lobbying", "fur", "leather", "wool",
  "animal", "animals", "testing", "cruelty", "vegan", "vegetarian", "plastic", "packaging", "organic", "local",
  "climate", "emissions", "labor", "workers", "worker", "privacy", "parental", "leave", "israel", "palestine", "gaza",
  "christian", "christianity", "faith", "religion", "muslim", "jewish", "lgbtq", "gay", "queer", "transgender",
  "walmart", "target", "starbucks", "mcdonalds", "chipotle", "shein", "costco", "patagonia", "netflix", "spotify",
  "uber", "shell", "coffee", "groceries", "restaurant", "restaurants", "chains", "unions", "wages", "sweatshop",
  "palm", "sustainable", "thrift", "secondhand", "wages", "benefits", "recycled", "carbon", "pollution",
];
const KNOWN = new Set(VOCAB);
const COMMON = new Set([
  "avoid", "prefer", "eat", "buy", "shop", "shopping", "support", "stop", "less", "more", "care", "about", "that", "with", "from",
  "companies", "brands", "stores", "products", "made", "using", "good", "chain", "also", "only", "never", "want", "dont", "don't",
  "have", "them", "they", "their", "this", "what", "when", "where", "which", "should", "would", "could", "like", "rights", "pay",
]);

function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function fix(word: string): string {
  const w = word.toLowerCase();
  if (w.length < 4 || KNOWN.has(w) || COMMON.has(w)) return word;
  const limit = w.length >= 7 ? 2 : 1;
  let best: string | null = null;
  let bestD = limit + 1;
  for (const v of KNOWN) {
    if (v[0] !== w[0] || Math.abs(v.length - w.length) > limit) continue;
    const d = distance(w, v);
    if (d < bestD) {
      best = v;
      bestD = d;
    }
  }
  if (!best) return word;
  return word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase() ? best[0].toUpperCase() + best.slice(1) : best;
}

export function correctText(input: string): { text: string; changed: boolean; original: string } {
  const text = input.replace(/[A-Za-z']+/g, (w) => fix(w));
  return { text, changed: text !== input, original: input };
}
