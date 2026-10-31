"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Screen } from "@/components/Screen";
import { Shimmer } from "@/components/ui/AISummary";
import { Search, Sparkle } from "@/components/ui/icons";
import { Monogram } from "@/components/ui/MerchantRow";
import { StatusMarker } from "@/components/ui/Status";
import { alternatives } from "@/data/alternatives";
import { hasDifferentParent, merchants, parentName } from "@/data/merchants";
import { getBrowseIntent } from "@/lib/ai/client";
import type { BrowseIntent } from "@/lib/ai/browse";
import { alternativeAsMerchant, label as labelOf } from "@/lib/engine";
import { useApp, useUI } from "@/lib/store";
import type { Label } from "@/lib/types";
import { useDerived } from "@/lib/useDerived";

const SHORTCUTS = ["Coffee", "Groceries", "Clothing", "Eating out", "Streaming", "Getting around", "Local"];
const ORDER: Label[] = ["Aligned", "Mixed", "Unknown", "Conflicts"];

type Result = { id: string; name: string; label?: Label; note: string; merchantId?: string };

export default function BrowsePage() {
  const d = useDerived();
  const aiMode = useApp((s) => s.aiMode);
  const openSheet = useUI((s) => s.openSheet);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [intent, setIntent] = useState<BrowseIntent | null>(null);

  const run = async (query: string) => {
    if (!query.trim()) return;
    setQ(query);
    setBusy(true);
    setIntent(await getBrowseIntent(query, aiMode));
    setBusy(false);
  };

  const results: Result[] = intent
    ? [
        ...merchants
          .filter((m) => m.tags.some((t) => intent.tags.includes(t)))
          .map((m) => ({
            id: m.id,
            merchantId: m.id,
            name: m.name,
            label: d.generic ? undefined : labelOf(m, d.profile).label,
            note: hasDifferentParent(m) ? `Owned by ${parentName(m)}` : m.category,
          })),
        ...alternatives
          .filter((a) => a.tags.some((t) => intent.tags.includes(t)))
          .map((a) => ({
            id: `alt-${a.name}`,
            name: a.name,
            label: d.generic ? undefined : labelOf(alternativeAsMerchant(a), d.profile).label,
            note: `Fictional alternative · ${a.priceDeltaPct > 0 ? "+" : ""}${a.priceDeltaPct}% price`,
          })),
      ]
    : [];
  const groups = ORDER.map((l) => ({ l, items: results.filter((r) => r.label === l) })).filter((g) => g.items.length);
  const ungrouped = results.filter((r) => !r.label);

  return (
    <Screen tabs>
      <h1 className="head mt-2 text-h2 text-black">Browse</h1>
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(q);
        }}
      >
        <label className="flex min-h-12 items-center gap-3 rounded-row border-2 border-hairline bg-white px-4 focus-within:border-black">
          <Search size={20} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask in your own words, like “coffee near me”"
            aria-label="Search brands"
            className="min-w-0 flex-1 bg-transparent font-serif text-body text-black outline-none placeholder:text-ink-3"
          />
        </label>
      </form>
      <div className="no-scrollbar -mx-6 mt-3 flex gap-2 overflow-x-auto px-6">
        {SHORTCUTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => void run(s)}
            className="caps min-h-10 shrink-0 rounded-pill border-2 border-hairline bg-white px-4 text-seg text-black"
          >
            {s}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {busy && (
          <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6">
            <Shimmer lines={3} label="Understanding what you're looking for" />
          </motion.div>
        )}
        {!busy && intent && (
          <motion.div key="res" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <p className="flex items-start gap-1.5 font-serif text-caption italic text-ink-2">
              <Sparkle size={15} strokeWidth={2.2} className="mt-0.5 shrink-0 text-royal" />
              {intent.summary}
            </p>
            {results.length === 0 ? (
              <p className="mt-4 font-serif text-body text-ink-2">Nothing matched yet. Try “coffee”, “clothing” or “local”.</p>
            ) : (
              <>
                {!d.generic && <p className="mt-2 font-serif text-micro text-ink-2">Grouped by how they match the values you chose. You decide what to do with that.</p>}
                {[...groups.map((g) => ({ title: g.l as string, items: g.items })), ...(ungrouped.length ? [{ title: "Results", items: ungrouped }] : [])].map((g) => (
                  <section key={g.title} className="mt-5">
                    <h2 className="caps mb-2 text-label text-ink-2">{g.title}</h2>
                    <ul className="flex flex-col gap-2">
                      {g.items.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            disabled={!r.merchantId}
                            onClick={() => r.merchantId && openSheet({ type: "merchant", id: r.merchantId })}
                            className="flex min-h-[68px] w-full items-center gap-3 rounded-row bg-white px-4 py-3 text-left"
                          >
                            <Monogram name={r.name} label={r.label} />
                            <span className="min-w-0 flex-1">
                              <span className="caps block truncate text-label text-black">{r.name}</span>
                              <span className="block truncate font-serif text-caption text-ink-2">{r.note}</span>
                            </span>
                            {r.label && <StatusMarker label={r.label} />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {!busy && !intent && (
        <p className="mt-8 text-center font-serif text-body text-ink-2">
          Search for a kind of place. Tally finds the options and checks each against the values you chose.
        </p>
      )}
    </Screen>
  );
}
