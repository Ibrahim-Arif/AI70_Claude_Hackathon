"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Goal, Importance, Preference, PriceBudget, Profile } from "./types";
import { CATALOG, catalogById, FAST_FOOD_PREF } from "./values";
import { merchantById } from "@/data/merchants";
import { transactions } from "@/data/transactions";
import { changedMerchants, flags, levelOf, summarize } from "./engine";
import { applyActions, dismissOpportunity, targetProposal, type ApplyResult } from "./tally/analysis";
import { emptyTallyState, type ActionProposal, type Ctx, type TallyState } from "./tally/types";

export type AIMode = "live" | "scripted";

type Persisted = TallyState & {
  name: string;
  /** ids of selected values (catalog or custom) in display order */
  selectedIds: string[];
  /** custom preferences created through the Add sheet */
  customs: Omit<Preference, "importance">[];
  importance: Record<string, Importance>;
  /** Free-sliding importance, 0 to 100. Takes precedence over `importance` when set. */
  weights: Record<string, number>;
  maxPriceIncreasePct: PriceBudget;
  mode: "values" | "generic";
  onboarded: boolean;
  kept: string[];
  /** Monthly spending target in dollars. */
  budget: number;
  /** Subset of kept: purchases the person marked as a need. */
  essential: string[];
  goal: Goal | null;
  aiMode: AIMode;
  /** What the user last saw on Home (count-ups start here) */
  lastSeen: Snapshot | null;
  /** What Home showed before the latest values change (for "since you changed your values") */
  changeBaseline: Snapshot | null;
};

export type Snapshot = { pct: number | null; conflicts: number; flagged: number };

type Actions = {
  set: (p: Partial<Persisted>) => void;
  toggleValue: (id: string) => void;
  addCustom: (pref: Omit<Preference, "importance">) => void;
  setImportance: (id: string, imp: Importance) => void;
  setWeight: (id: string, weight: number) => void;
  keep: (id: string) => void;
  markEssential: (id: string) => void;
  fillPersona: (labor?: Importance) => void;
  fillSam: () => void;
  /** Validate and apply approved Tally proposals. Nothing changes without a call to this. */
  tallyApply: (actions: ActionProposal[], source: string) => ApplyResult;
  tallyDismiss: (id: string) => void;
  tallyEditTarget: (category: string, amount: number) => string[];
  tallyRemoveTarget: (category: string) => void;
  tallyRemoveReview: (merchantId: string) => void;
  tallyRemoveConsideration: (merchantId: string, alt: string) => void;
  tallyForget: (id: string) => void;
  reset: () => void;
};

export const initialState: Persisted = {
  ...emptyTallyState,
  name: "",
  selectedIds: [],
  customs: [],
  importance: {},
  weights: {},
  maxPriceIncreasePct: 5,
  mode: "values",
  onboarded: false,
  kept: [],
  essential: [],
  budget: 2200,
  goal: null,
  aiMode: "live",
  lastSeen: null,
  changeBaseline: null,
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
      setImportance: (id, imp) =>
        set((s) => {
          const { [id]: _drop, ...weights } = s.weights; // eslint-disable-line @typescript-eslint/no-unused-vars
          return { importance: { ...s.importance, [id]: imp }, weights };
        }),
      setWeight: (id, weight) =>
        set((s) => ({
          weights: { ...s.weights, [id]: Math.round(weight) },
          importance: { ...s.importance, [id]: levelOf(weight) },
        })),
      keep: (id) => set((s) => ({ kept: s.kept.includes(id) ? s.kept : [...s.kept, id] })),
      markEssential: (id) =>
        set((s) => ({
          kept: s.kept.includes(id) ? s.kept : [...s.kept, id],
          essential: s.essential.includes(id) ? s.essential : [...s.essential, id],
        })),
      fillSam: () =>
        set({
          ...initialState,
          aiMode: get().aiMode,
          name: "Sam",
          selectedIds: ["labor", "climate"],
          importance: { labor: "important", climate: "nice" },
          maxPriceIncreasePct: 0,
          mode: "values",
          onboarded: true,
        }),
      fillPersona: (labor = "important") =>
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
      tallyApply: (actions, source) => {
        const s = get();
        const result = applyActions(s, ctxOf(s), actions, new Date().toISOString(), source);
        set({ ...result.state, ...(result.budget !== undefined ? { budget: result.budget } : {}) });
        return result;
      },
      tallyDismiss: (id) => set((s) => dismissOpportunity(s, id, new Date().toISOString())),
      tallyEditTarget: (category, amount) => {
        const s = get();
        const without = { ...s.targets };
        delete without[category];
        const base: TallyState = { ...s, targets: without };
        const r = applyActions(base, ctxOf({ ...s, targets: without }), [targetProposal(category, Math.round(amount))], new Date().toISOString(), "edited");
        if (r.rejected.length) return r.rejected[0].errors;
        set({ targets: r.state.targets, decisions: r.state.decisions });
        return [];
      },
      tallyRemoveTarget: (category) =>
        set((s) => {
          const targets = { ...s.targets };
          delete targets[category];
          return { targets };
        }),
      tallyRemoveReview: (merchantId) => set((s) => ({ reviewList: s.reviewList.filter((x) => x !== merchantId) })),
      tallyRemoveConsideration: (merchantId, alt) =>
        set((s) => ({ consideration: s.consideration.filter((c) => !(c.merchantId === merchantId && c.alt === alt)) })),
      tallyForget: (id) =>
        set((s) => ({
          dismissed: s.dismissed.filter((d) => (id === "values" ? !d.startsWith("values:") : d !== id)),
        })),
      reset: () => set({ ...initialState, aiMode: get().aiMode }),
    }),
    {
      name: "tally-demo-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { set, toggleValue, addCustom, setImportance, setWeight, keep, markEssential, fillPersona, fillSam, tallyApply, tallyDismiss, tallyEditTarget, tallyRemoveTarget, tallyRemoveReview, tallyRemoveConsideration, tallyForget, reset, ...rest } = s;
        return rest;
      },
    },
  ),
);

/** The inputs Tally's pure logic needs, read from app state. */
export function ctxOf(s: Persisted): Ctx {
  return {
    targets: s.targets,
    reviewList: s.reviewList,
    consideration: s.consideration,
    decisions: s.decisions,
    dismissed: s.dismissed,
    kept: s.kept,
    budget: s.budget,
    profile: buildProfile(s),
  };
}

function defaultImportance(id: string): Importance {
  return catalogById[id]?.defaultImportance ?? "important";
}

/** Build the engine Profile from store state. */
export function buildProfile(
  s: Pick<Persisted, "name" | "selectedIds" | "customs" | "importance" | "maxPriceIncreasePct" | "mode"> & { weights?: Record<string, number> },
): Profile {
  const all: Record<string, Omit<Preference, "importance">> = {
    ...Object.fromEntries(CATALOG.map((c) => [c.id, c.pref])),
    ...Object.fromEntries(s.customs.map((c) => [c.id, c])),
  };
  const preferences =
    s.mode === "generic"
      ? []
      : s.selectedIds
          .filter((id) => all[id])
          .map((id) => {
            const weight = s.weights?.[id];
            return weight === undefined
              ? { ...all[id], importance: s.importance[id] ?? defaultImportance(id) }
              : { ...all[id], importance: levelOf(weight), weight };
          });
  return { name: s.name, preferences, maxPriceIncreasePct: s.maxPriceIncreasePct };
}

export function useProfile(): Profile {
  const name = useApp((s) => s.name);
  const selectedIds = useApp((s) => s.selectedIds);
  const customs = useApp((s) => s.customs);
  const importance = useApp((s) => s.importance);
  const weights = useApp((s) => s.weights);
  const maxPriceIncreasePct = useApp((s) => s.maxPriceIncreasePct);
  const mode = useApp((s) => s.mode);
  // buildProfile is cheap; keep identity stable per input set
  return useMemoProfile(name, selectedIds, customs, importance, weights, maxPriceIncreasePct, mode);
}

function useMemoProfile(
  name: string,
  selectedIds: string[],
  customs: Omit<Preference, "importance">[],
  importance: Record<string, Importance>,
  weights: Record<string, number>,
  maxPriceIncreasePct: PriceBudget,
  mode: "values" | "generic",
) {
  return useMemo(
    () => buildProfile({ name, selectedIds, customs, importance, weights, maxPriceIncreasePct, mode }),
    [name, selectedIds, customs, importance, weights, maxPriceIncreasePct, mode],
  );
}

/**
 * Apply a values change from the Values tab and report which merchants changed.
 * Records the % the user last saw so Home can animate from it.
 */
export function applyValuesChange(mutate: () => void): { changed: string[] } {
  const before = buildProfile(useApp.getState());
  const beforeSnap = snapshot(before, useApp.getState().kept);
  mutate();
  const state = useApp.getState();
  const after = buildProfile(state);
  const changed = changedMerchants(transactions, merchantById, before, after);
  if (changed.length) {
    useApp.setState({ changeBaseline: state.lastSeen ?? beforeSnap });
  }
  return { changed };
}

/** The numbers Home shows for a profile. */
export function snapshot(profile: Profile, kept: string[]): Snapshot {
  const s = summarize(transactions, merchantById, profile);
  const conflicts = Object.entries(s.labels).filter(([id, l]) => l === "Conflicts" && !kept.includes(id)).length;
  return { pct: s.alignmentPct, conflicts, flagged: flags(transactions, merchantById, profile, kept).length };
}

// ---------------------------------------------------------------- transient UI

export type Sheet =
  | { type: "merchant"; id: string }
  | { type: "goal"; merchantId: string }
  | { type: "add"; text?: string }
  | { type: "settings" }
  | { type: "demo" }
  | { type: "howcalc" }
  | { type: "bank" }
  | { type: "karma" }
  | { type: "tallyConfirm"; title: string; source: string; actions: ActionProposal[] }
  | { type: "notifications" }
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
  useApp.getState().fillPersona("important");
}
