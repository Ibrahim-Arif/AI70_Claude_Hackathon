"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Goal, Importance, Preference, PriceBudget, Profile } from "./types";
import { CATALOG, catalogById, FAST_FOOD_PREF } from "./values";
import { merchantById } from "@/data/merchants";
import { transactions } from "@/data/transactions";
import { changedMerchants, summarize } from "./engine";

export type AIMode = "live" | "scripted";

type Persisted = {
  name: string;
  /** ids of selected values (catalog or custom) in display order */
  selectedIds: string[];
  /** custom preferences created through the Add sheet */
  customs: Omit<Preference, "importance">[];
  importance: Record<string, Importance>;
  maxPriceIncreasePct: PriceBudget;
  mode: "values" | "generic";
  onboarded: boolean;
  kept: string[];
  goal: Goal | null;
  aiMode: AIMode;
  /** % the user last saw on Home (count-up starts here) */
  lastSeenPct: number | null;
  /** % before the user's latest values change (for "since you changed your values") */
  changeBaselinePct: number | null;
};

type Actions = {
  set: (p: Partial<Persisted>) => void;
  toggleValue: (id: string) => void;
  addCustom: (pref: Omit<Preference, "importance">) => void;
  setImportance: (id: string, imp: Importance) => void;
  keep: (id: string) => void;
  fillPersona: (labor?: Importance) => void;
  reset: () => void;
};

export const initialState: Persisted = {
  name: "",
  selectedIds: [],
  customs: [],
  importance: {},
  maxPriceIncreasePct: 5,
  mode: "values",
  onboarded: false,
  kept: [],
  goal: null,
  aiMode: "live",
  lastSeenPct: null,
  changeBaselinePct: null,
};

export const useApp = create<Persisted & Actions>()(
  persist(
    (set, get) => ({
      ...initialState,
      set: (p) => set(p),
      toggleValue: (id) =>
        set((s) => {
          const on = s.selectedIds.includes(id);
          return {
            selectedIds: on ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id],
            importance: on || s.importance[id] ? s.importance : { ...s.importance, [id]: defaultImportance(id) },
          };
        }),
      addCustom: (pref) =>
        set((s) => ({
          customs: [...s.customs.filter((c) => c.id !== pref.id), pref],
          selectedIds: s.selectedIds.includes(pref.id) ? s.selectedIds : [...s.selectedIds, pref.id],
          importance: { ...s.importance, [pref.id]: s.importance[pref.id] ?? "important" },
        })),
      setImportance: (id, imp) => set((s) => ({ importance: { ...s.importance, [id]: imp } })),
      keep: (id) => set((s) => ({ kept: s.kept.includes(id) ? s.kept : [...s.kept, id] })),
      fillPersona: (labor = "nice") =>
        set({
          ...initialState,
          aiMode: get().aiMode,
          name: "Maya",
          selectedIds: ["climate", "labor", FAST_FOOD_PREF.id, "local"],
          customs: [FAST_FOOD_PREF],
          importance: { climate: "important", labor, [FAST_FOOD_PREF.id]: "important", local: "important" },
          maxPriceIncreasePct: 5,
          mode: "values",
          onboarded: true,
        }),
      reset: () => set({ ...initialState, aiMode: get().aiMode }),
    }),
    {
      name: "tally-demo-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { set, toggleValue, addCustom, setImportance, keep, fillPersona, reset, ...rest } = s;
        return rest;
      },
    },
  ),
);

function defaultImportance(id: string): Importance {
  return catalogById[id]?.defaultImportance ?? "important";
}

/** Build the engine Profile from store state. */
export function buildProfile(s: Pick<Persisted, "name" | "selectedIds" | "customs" | "importance" | "maxPriceIncreasePct" | "mode">): Profile {
  const all: Record<string, Omit<Preference, "importance">> = {
    ...Object.fromEntries(CATALOG.map((c) => [c.id, c.pref])),
    ...Object.fromEntries(s.customs.map((c) => [c.id, c])),
  };
  const preferences =
    s.mode === "generic"
      ? []
      : s.selectedIds
          .filter((id) => all[id])
          .map((id) => ({ ...all[id], importance: s.importance[id] ?? defaultImportance(id) }));
  return { name: s.name, preferences, maxPriceIncreasePct: s.maxPriceIncreasePct };
}

export function useProfile(): Profile {
  const name = useApp((s) => s.name);
  const selectedIds = useApp((s) => s.selectedIds);
  const customs = useApp((s) => s.customs);
  const importance = useApp((s) => s.importance);
  const maxPriceIncreasePct = useApp((s) => s.maxPriceIncreasePct);
  const mode = useApp((s) => s.mode);
  // buildProfile is cheap; keep identity stable per input set
  return useMemoProfile(name, selectedIds, customs, importance, maxPriceIncreasePct, mode);
}

function useMemoProfile(
  name: string,
  selectedIds: string[],
  customs: Omit<Preference, "importance">[],
  importance: Record<string, Importance>,
  maxPriceIncreasePct: PriceBudget,
  mode: "values" | "generic",
) {
  return useMemo(
    () => buildProfile({ name, selectedIds, customs, importance, maxPriceIncreasePct, mode }),
    [name, selectedIds, customs, importance, maxPriceIncreasePct, mode],
  );
}

/**
 * Apply a values change from the Values tab and report which merchants changed.
 * Records the % the user last saw so Home can animate from it.
 */
export function applyValuesChange(mutate: () => void): { changed: string[] } {
  const before = buildProfile(useApp.getState());
  const beforePct = summarize(transactions, merchantById, before).alignmentPct;
  mutate();
  const state = useApp.getState();
  const after = buildProfile(state);
  const changed = changedMerchants(transactions, merchantById, before, after);
  if (changed.length) {
    useApp.setState({ changeBaselinePct: state.lastSeenPct ?? beforePct });
  }
  return { changed };
}

// ---------------------------------------------------------------- transient UI

export type Sheet =
  | { type: "merchant"; id: string }
  | { type: "goal"; merchantId: string }
  | { type: "add" }
  | { type: "settings" }
  | { type: "demo" }
  | { type: "howcalc" }
  | { type: "bank" }
  | null;

export type Toast = { id: number; text: string; action?: { label: string; href: string; onClick?: () => void } };

type UI = {
  sheet: Sheet;
  toast: Toast | null;
  pulseIds: string[];
  reportTab: "october" | "november";
  spendingFilter: "all" | "flagged" | "unknown";
  openSheet: (s: Sheet) => void;
  closeSheet: () => void;
  showToast: (text: string, action?: Toast["action"]) => void;
  hideToast: () => void;
};

export const useUI = create<UI>()((set) => ({
  sheet: null,
  toast: null,
  pulseIds: [],
  reportTab: "october",
  spendingFilter: "all",
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  showToast: (text, action) => set({ toast: { id: Date.now(), text, action } }),
  hideToast: () => set({ toast: null }),
}));

// Demo shortcut: any URL with ?fill=maya loads Maya's profile before first render.
if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("fill") === "maya") {
  useApp.getState().fillPersona("nice");
}
