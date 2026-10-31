import { FAST_FOOD_PREF } from "@/lib/values";
import { correctText } from "./spell";
import type { ParseOutput, ParseResponse } from "./schemas";

export const FAILED: ParseResponse = {
  status: "failed",
  message: "We couldn't read that. Try rephrasing or pick from the list.",
};

export const DECLINED_MESSAGE =
  "We can help you support businesses, like women-owned or immigrant-owned. We don't filter businesses out based on who owns them.";

export const UNKNOWN_EXPLANATION = "There isn't enough reliable evidence to recommend a change here.";

const GROUPS =
  /\b(black|white|asian|jewish|jews?|muslims?|islamic|christians?|catholics?|hindus?|sikhs?|buddhists?|atheists?|immigrants?|foreign(ers?)?|chinese|mexican|indian|arabs?|latin[oax]s?|hispanic|african|korean|japanese|russian|israeli|palestinian|women|woman|female|men|man|male|gay|lesbian|lgbt\w*|queer|trans(gender)?|minorit(y|ies))\b/i;
const OWNERSHIP = /(owned|owner|owners|run by|founded by|operated by|led by|ceo is|ceos are)/i;
const AVOID =
  /\b(avoid|boycott|don'?t|do not|never|stop|no|not|exclude|filter|block|ban|skip|against|refuse|hate|less)\b/i;

/** Avoidance targeted at who owns a business (race, religion, nationality, gender, orientation...). */
export function isIdentityAvoidance(text: string): boolean {
  return GROUPS.test(text) && OWNERSHIP.test(text) && AVOID.test(text);
}

/** Scripted parse for the known demo inputs. Returns null when the input isn't known. */
export function scriptedParse(text: string, history: { q: string; a: string }[]): ParseOutput | null {
  const t = correctText(text).text.toLowerCase();

  if (isIdentityAvoidance(text)) return { status: "declined", message: DECLINED_MESSAGE };

  if (/fast[\s-]?food/.test(t)) {
    if (history.length === 0) {
      return { status: "clarify", question: "Does fast casual like Chipotle count?", options: ["Yes", "No"] };
    }
    const counts = /^y/i.test(history[0].a.trim());
    return {
      status: "result",
      preference: {
        ...FAST_FOOD_PREF,
        type: "attribute",
        rule: counts
          ? { kind: "attribute", tag: "fast_food", polarity: "avoid", alsoTags: ["fast_casual"] }
          : { kind: "attribute", tag: "fast_food", polarity: "avoid" },
        sourceText: text,
        clarifications: history,
      },
      summary: counts
        ? "We'll look for fast-food and fast-casual chains, like McDonald's and Chipotle."
        : "We'll look for fast-food chains like McDonald's. Fast casual places like Chipotle don't count.",
      basis: "Based on merchant category",
    };
  }

  if (/\bamazon\b/.test(t)) {
    return {
      status: "result",
      preference: {
        id: "custom-avoid-amazon",
        label: "Avoid Amazon",
        sourceText: text,
        type: "entity",
        rule: { kind: "entity", parentId: "amazon", polarity: "avoid" },
        clarifications: history,
      },
      summary: "Also covers Whole Foods (owned by Amazon).",
      basis: "Based on who owns the company",
    };
  }

  if (/politic/.test(t)) {
    if (history.length === 0) {
      return {
        status: "clarify",
        question: "What do you mean by political association?",
        options: [
          "Companies that donate to politics at all",
          "Donations to a specific party or cause",
          "Lobbying on a specific issue",
        ],
        progress: { step: 1, total: 2 },
      };
    }
    if (history.length === 1) {
      return {
        status: "clarify",
        question: "Which counts?",
        options: ["Corporate PAC", "Executive donations", "Trade groups"],
        progress: { step: 2, total: 2 },
      };
    }
    return {
      status: "result",
      preference: {
        id: "custom-political",
        label: "Political spending",
        sourceText: text,
        type: "rating",
        rule: { kind: "rating", issue: "political" },
        clarifications: history,
      },
      summary: `We'll use company ratings on political spending, counting ${history[1].a}.`,
      basis: "Based on company ratings",
    };
  }

  // Contested topics: Tally takes no side. Ask what the person wants to look at, map only
  // what the data supports, and save the rest honestly as not tracked yet.
  // Animal products: ask how specific the person wants to be, then save a precise value.
  if (/\b(fur|leather|wool|down feathers?|animal[- ]derived|animal products?|cruelty|animal testing)\b/.test(t) || /\banimals?\b/.test(t)) {
    const SPECIFIC: Record<string, string> = {
      "Fur only": "Avoid fur",
      "Fur and leather": "Avoid fur and leather",
      "All animal-derived materials": "Avoid animal-derived materials",
      "Animal testing": "Avoid brands that test on animals",
    };
    if (history.length === 0) {
      return {
        status: "clarify",
        question: "How specific do you want to be?",
        options: Object.keys(SPECIFIC),
        progress: { step: 1, total: 1 },
      };
    }
    const label = SPECIFIC[history[0].a] ?? `Avoid ${history[0].a.toLowerCase()}`;
    return {
      status: "unsupported",
      label,
      message: "We can't track this yet. We've saved it and will tell you when we have reliable data.",
    };
  }

  const topic = /lgbt|queer|\bgay\b|transgender|\btrans\b|pride/.test(t)
    ? {
        label: "LGBTQ+ rights",
        opts: ["Company political donations and lobbying", "Workplace policies for LGBTQ+ employees", "Supporting LGBTQ+-owned businesses"],
      }
    : /israel|palestin|gaza/.test(t)
    ? { label: "Israel and Palestine", opts: ["Company political donations and lobbying", "Business operations in the region", "Something else"] }
    : /christian|faith|religio|church|islam|muslim|jewish|judaism|hindu|buddhis/.test(t)
      ? { label: "Faith and religion", opts: ["Company political donations on faith-related issues", "Support for faith-based community businesses", "Something else"] }
      : null;
  if (topic) {
    if (history.length === 0) {
      return {
        status: "clarify",
        question: "What would you like Tally to look at? We don't take a side.",
        options: topic.opts,
        progress: { step: 1, total: 1 },
      };
    }
    if (/political/i.test(history[0].a)) {
      return {
        status: "result",
        preference: {
          id: `custom-${topic.label.toLowerCase().replace(/[^a-z]+/g, "-")}`,
          label: "Political spending",
          sourceText: text,
          type: "rating",
          rule: { kind: "rating", issue: "political" },
          clarifications: history,
        },
        summary: "We'll use company ratings on political spending. They don't tell you which side a donation favors.",
        basis: "Based on company ratings",
      };
    }
    return {
      status: "unsupported",
      label: topic.label,
      message: "We can't track this yet. We've saved it and will tell you when we have reliable data.",
    };
  }

  if (/parental leave/.test(t)) {
    return {
      status: "unsupported",
      label: "Parental leave",
      message: "We can't track this yet. We've saved it and will tell you when we have reliable data.",
    };
  }

  return null;
}
