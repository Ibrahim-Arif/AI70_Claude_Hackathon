"use client";

import { merchantById } from "@/data/merchants";
import { explainKey, getExplanation } from "./ai/client";
import { label } from "./engine";
import { applyValuesChange, buildProfile, useApp, useUI } from "./store";

/** Run a values change, then show "N merchants changed · View" and pre-warm Amazon's explanation. */
export function changeValues(mutate: () => void, fallbackText = "Saved") {
  const { changed } = applyValuesChange(mutate);
  const n = changed.length;
  const ui = useUI.getState();
  if (n) {
    ui.showToast(`${n} ${n === 1 ? "merchant" : "merchants"} changed`, {
      label: "View",
      href: "/spending?filter=flagged",
      onClick: () => useUI.setState({ pulseIds: changed, spendingFilter: "flagged" }),
    });
  } else {
    ui.showToast(`${fallbackText}. No labels changed.`);
  }
  prewarmAmazon();
  return changed;
}

let lastWarm = "";
export function prewarmAmazon() {
  const s = useApp.getState();
  const profile = buildProfile(s);
  const amazon = merchantById.amazon;
  const key = explainKey("amazon", profile, s.aiMode);
  if (key === lastWarm || profile.preferences.length === 0) return;
  lastWarm = key;
  // background, ignore failures
  void getExplanation(amazon, label(amazon, profile), profile, s.aiMode).catch(() => {});
}
