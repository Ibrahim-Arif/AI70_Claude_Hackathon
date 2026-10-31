"use client";

import { AnimatePresence } from "motion/react";
import { BottomSheet } from "./ui/BottomSheet";
import { AddSheet } from "./sheets/AddSheet";
import { BankSheet } from "./sheets/BankSheet";
import { GoalSheet } from "./sheets/GoalSheet";
import { MerchantSheet } from "./sheets/MerchantSheet";
import { TallyConfirmSheet } from "./sheets/TallyConfirmSheet";
import { DemoPanel, HowCalcSheet, KarmaSheet, NotificationsSheet, SettingsSheet } from "./sheets/SmallSheets";
import { useUI } from "@/lib/store";
import { merchantById } from "@/data/merchants";

export function Overlays() {
  const sheet = useUI((s) => s.sheet);
  const close = useUI((s) => s.closeSheet);

  let key = "none";
  let content: React.ReactNode = null;
  let label = "";
  let tall = false;
  if (sheet) {
    switch (sheet.type) {
      case "merchant":
        if (!merchantById[sheet.id]) break;
        key = `m-${sheet.id}`;
        label = merchantById[sheet.id].name;
        content = <MerchantSheet id={sheet.id} />;
        tall = true;
        break;
      case "goal":
        key = `g-${sheet.merchantId}`;
        label = "Set a goal";
        content = <GoalSheet merchantId={sheet.merchantId} />;
        break;
      case "add":
        key = "add";
        label = "Add your own value";
        content = <AddSheet />;
        break;
      case "settings":
        key = "settings";
        label = "Settings";
        content = <SettingsSheet />;
        break;
      case "demo":
        key = "demo";
        label = "Demo panel";
        content = <DemoPanel />;
        tall = true;
        break;
      case "howcalc":
        key = "howcalc";
        label = "How we calculate";
        content = <HowCalcSheet />;
        break;
      case "tallyConfirm":
        key = `tc-${sheet.title}`;
        label = "Review and approve";
        content = <TallyConfirmSheet title={sheet.title} source={sheet.source} actions={sheet.actions} />;
        tall = true;
        break;
      case "karma":
        key = "karma";
        label = "Karma credits";
        content = <KarmaSheet />;
        break;
      case "notifications":
        key = "notifications";
        label = "Notifications";
        content = <NotificationsSheet />;
        break;
      case "bank":
        key = "bank";
        label = "Demo bank connection";
        content = <BankSheet />;
        break;
    }
  }

  return (
    <AnimatePresence>
      {content && (
        <BottomSheet key={key} onClose={close} label={label} tall={tall}>
          {content}
        </BottomSheet>
      )}
    </AnimatePresence>
  );
}
