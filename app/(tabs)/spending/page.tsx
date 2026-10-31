"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Screen } from "@/components/Screen";
import { MerchantRow } from "@/components/ui/MerchantRow";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { hasDifferentParent, parentName } from "@/data/merchants";
import { genericSummary } from "@/lib/engine";
import { useUI } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { isPreferRule } from "@/lib/values";

type Filter = "all" | "flagged" | "unknown";

export default function SpendingPage() {
  const d = useDerived();
  const storeFilter = useUI((s) => s.spendingFilter);
  // ?filter= wins on arrival, so the list never renders "All" first and then reshuffles
  const [urlFilter, setUrlFilter] = useState<Filter | null>(() => {
    if (typeof window === "undefined") return null;
    const f = new URLSearchParams(window.location.search).get("filter");
    return f === "flagged" || f === "unknown" || f === "all" ? f : null;
  });
  const filter = urlFilter ?? storeFilter;
  const pulseIds = useUI((s) => s.pulseIds);
  const openSheet = useUI((s) => s.openSheet);
  const setFilter = (f: Filter) => {
    setUrlFilter(null);
    useUI.setState({ spendingFilter: f });
  };

  useEffect(() => {
    if (urlFilter) useUI.setState({ spendingFilter: urlFilter });
  }, [urlFilter]);

  // Clear the pulse after it plays
  useEffect(() => {
    if (!pulseIds.length) return;
    const t = setTimeout(() => useUI.setState({ pulseIds: [] }), 2200);
    return () => clearTimeout(t);
  }, [pulseIds]);

  const rows =
    filter === "flagged"
      ? d.flagIds.map((id) => d.rows.find((r) => r.merchant.id === id)!).filter(Boolean)
      : filter === "unknown"
        ? d.rows.filter((r) => (d.generic ? r.merchant.ratings.length === 0 : r.result.label === "Unknown"))
        : d.rows;

  const total = rows.reduce((s, r) => s + r.spend, 0);

  return (
    <Screen tabs>
      <h1 className="head mt-2 text-h2 text-black">Spending</h1>
      <div className="mt-5">
        <SegmentedControl<Filter>
          ariaLabel="Filter merchants"
          options={[
            { value: "all", label: "All" },
            { value: "flagged", label: "Flagged" },
            { value: "unknown", label: d.generic ? "Unrated" : "Unknown" },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>
      <p className="mt-4 font-serif text-caption text-ink-2" aria-live="polite">
        {rows.length} {rows.length === 1 ? "merchant" : "merchants"} · ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in October
      </p>

      <motion.ul layout className="mt-3 flex flex-col gap-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {rows.map(({ merchant: m, spend, result }, i) => (
            <motion.li
              key={m.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i * 0.03, 0.4), type: "spring", stiffness: 400, damping: 34 } }}
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
            >
              <MerchantRow
                name={m.name}
                ownedBy={hasDifferentParent(m) ? parentName(m) : undefined}
                amount={spend}
                label={d.generic ? undefined : result.label}
                generic={d.generic ? genericSummary(m) : undefined}
                supportsLocal={!d.generic && result.supports.some(isPreferRule)}
                kept={d.kept.includes(m.id)}
                pulse={pulseIds.includes(m.id)}
                onClick={() => openSheet({ type: "merchant", id: m.id })}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      {rows.length === 0 && (
        <p className="mt-10 text-center font-serif text-body text-ink-2">
          {filter === "flagged"
            ? d.generic
              ? "Set your values to see flags."
              : "Nothing flagged against your values."
            : "Nothing here."}
        </p>
      )}
      <p className="mt-8 text-center font-serif text-caption text-ink-2">Ratings are illustrative demo data.</p>
    </Screen>
  );
}
