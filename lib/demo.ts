"use client";

import { useApp, useUI } from "./store";

type Router = { push: (href: string) => void; replace: (href: string) => void };

export type DemoJump =
  | "reset"
  | "start"
  | "home78"
  | "values"
  | "home64"
  | "spending"
  | "amazon"
  | "reportNov"
  | "reportOct"
  | "loading"
  | "sam";

export const DEMO_JUMPS: { id: DemoJump; label: string; key?: string }[] = [
  { id: "start", label: "Start", key: "1" },
  { id: "home78", label: "Home (2 conflicts)", key: "2" },
  { id: "values", label: "Values tab", key: "3" },
  { id: "home64", label: "Home (after Dealbreaker)", key: "4" },
  { id: "spending", label: "Spending", key: "5" },
  { id: "amazon", label: "Amazon sheet", key: "6" },
  { id: "reportNov", label: "Report November", key: "7" },
  { id: "reportOct", label: "Report October", key: "8" },
  { id: "loading", label: "Loading screen", key: "9" },
  { id: "sam", label: "Same evidence, different values (Sam)", key: "0" },
];

export const DEMO_KEYS: Record<string, DemoJump> = Object.fromEntries(
  DEMO_JUMPS.filter((j) => j.key).map((j) => [j.key!, j.id]),
);

/** What Home shows for Maya before she changes Worker treatment. */
const BEFORE = { pct: 60, conflicts: 2, flagged: 7 };

function ensurePersona() {
  if (!useApp.getState().onboarded) useApp.getState().fillPersona("important");
}

export function runDemoJump(id: DemoJump, router: Router) {
  const app = useApp.getState();
  const ui = useUI.getState();
  ui.closeSheet();
  ui.hideToast();
  useUI.setState({ pulseIds: [], spendingFilter: "all" });

  switch (id) {
    case "reset":
      app.reset();
      useUI.setState({ reportTab: "october" });
      router.replace("/start");
      ui.showToast("Demo reset");
      return;
    case "start":
      app.reset();
      router.replace("/start");
      return;
    case "home78":
      app.fillPersona("important");
      useApp.setState({ lastSeen: null, changeBaseline: null });
      router.push("/home");
      return;
    case "home64":
      app.fillPersona("dealbreaker");
      useApp.setState({ lastSeen: BEFORE, changeBaseline: BEFORE });
      router.push("/home");
      return;
    case "values":
      ensurePersona();
      router.push("/you");
      return;
    case "spending":
      ensurePersona();
      router.push("/spending");
      return;
    case "amazon":
      ensurePersona();
      router.push("/spending");
      setTimeout(() => useUI.getState().openSheet({ type: "merchant", id: "amazon" }), 350);
      return;
    case "sam":
      app.fillSam();
      useApp.setState({ lastSeen: null, changeBaseline: null });
      router.push("/spending");
      setTimeout(() => useUI.getState().openSheet({ type: "merchant", id: "amazon" }), 350);
      return;
    case "reportNov":
      ensurePersona();
      useUI.setState({ reportTab: "november" });
      router.push("/report");
      return;
    case "reportOct":
      ensurePersona();
      useUI.setState({ reportTab: "october" });
      router.push("/report");
      return;
    case "loading":
      ensurePersona();
      router.push("/loading");
      return;
  }
}
