import type { Importance, Preference, Profile } from "./types";

export type CatalogEntry = {
  /** row id on the Values screen */
  id: string;
  /** caps label on the SelectionRow */
  rowLabel: string;
  icon: "leaf" | "hands" | "columns" | "lock" | "paw" | "store";
  pref: Omit<Preference, "importance">;
  defaultImportance: Importance;
};

export const CATALOG: CatalogEntry[] = [
  {
    id: "climate",
    rowLabel: "Climate",
    icon: "leaf",
    pref: { id: "climate", label: "Climate", type: "rating", rule: { kind: "rating", issue: "climate" } },
    defaultImportance: "important",
  },
  {
    id: "labor",
    rowLabel: "Worker treatment",
    icon: "hands",
    pref: { id: "labor", label: "Worker treatment", type: "rating", rule: { kind: "rating", issue: "labor" } },
    defaultImportance: "important",
  },
  {
    id: "political",
    rowLabel: "Political spending",
    icon: "columns",
    pref: { id: "political", label: "Political spending", type: "rating", rule: { kind: "rating", issue: "political" } },
    defaultImportance: "important",
  },
  {
    id: "privacy",
    rowLabel: "Privacy",
    icon: "lock",
    pref: { id: "privacy", label: "Privacy", type: "rating", rule: { kind: "rating", issue: "privacy" } },
    defaultImportance: "important",
  },
  {
    id: "animal",
    rowLabel: "Animal welfare",
    icon: "paw",
    pref: { id: "animal", label: "Animal welfare", type: "unsupported" },
    defaultImportance: "nice",
  },
  {
    id: "local",
    rowLabel: "Local business",
    icon: "store",
    pref: {
      id: "local",
      label: "Support local",
      type: "attribute",
      rule: { kind: "attribute", tag: "local", polarity: "prefer" },
    },
    defaultImportance: "important",
  },
];

export const catalogById: Record<string, CatalogEntry> = Object.fromEntries(
  CATALOG.map((c) => [c.id, c]),
);

export const FAST_FOOD_PREF: Omit<Preference, "importance"> = {
  id: "custom-fast-food",
  label: "Avoid fast-food chains",
  sourceText: "I prefer not to eat at fast food chains",
  type: "attribute",
  rule: { kind: "attribute", tag: "fast_food", polarity: "avoid" },
  clarifications: [{ q: "Does fast casual like Chipotle count?", a: "No" }],
};

/** Maya's preferences after the scripted onboarding. */
export function personaProfile(laborImportance: Importance = "important"): Profile {
  return {
    name: "Maya",
    maxPriceIncreasePct: 5,
    preferences: [
      { ...catalogById.climate.pref, importance: "important" },
      { ...catalogById.labor.pref, importance: laborImportance },
      { ...FAST_FOOD_PREF, importance: "important" },
      { ...catalogById.local.pref, importance: "important" },
    ],
  };
}

export function isPreferRule(p: Pick<Preference, "rule">): boolean {
  return p.rule?.kind === "attribute" && p.rule.polarity === "prefer";
}

export const IMPORTANCE_WORD: Record<Importance, string> = {
  nice: "nice to have",
  important: "important",
  dealbreaker: "a dealbreaker",
};
