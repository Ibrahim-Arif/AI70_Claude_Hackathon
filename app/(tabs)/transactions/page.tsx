"use client";

import { useMemo, useState } from "react";
import { Screen } from "@/components/Screen";
import { money2 } from "@/components/ui/CountUp";
import { Search } from "@/components/ui/icons";
import { Monogram } from "@/components/ui/MerchantRow";
import { StatusMarker } from "@/components/ui/Status";
import { co2eOf } from "@/data/emissions";
import { merchantById } from "@/data/merchants";
import { transactions } from "@/data/transactions";
import { useUI } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateLabel = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;

export default function TransactionsPage() {
  const d = useDerived();
  const openSheet = useUI((s) => s.openSheet);
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = [...transactions]
      .filter((t) => {
        const name = (t.merchantId ? merchantById[t.merchantId]?.name : t.rawName) ?? t.rawName;
        return !needle || name.toLowerCase().includes(needle) || t.rawName.toLowerCase().includes(needle);
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);
    const out: { date: string; items: typeof list }[] = [];
    for (const t of list) {
      const g = out.find((x) => x.date === t.date);
      if (g) g.items.push(t);
      else out.push({ date: t.date, items: [t] });
    }
    return out;
  }, [q]);

  return (
    <Screen tabs>
      <h1 className="head mt-2 text-h2 text-black">Transactions</h1>
      <label className="mt-4 flex min-h-12 items-center gap-3 rounded-row border-2 border-hairline bg-white px-4">
        <Search size={20} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search transactions"
          aria-label="Search transactions"
          className="min-w-0 flex-1 bg-transparent font-serif text-body text-black outline-none placeholder:text-ink-3"
        />
      </label>
      <p className="mt-3 font-serif text-caption text-ink-2">
        Each purchase is matched to the company behind it. Tap one to see the evidence.
      </p>

      {groups.map((g) => (
        <section key={g.date} className="mt-6">
          <h2 className="caps mb-2 text-label text-ink-2">{dateLabel(g.date)}</h2>
          <ul className="flex flex-col gap-2">
            {g.items.map((t) => {
              const m = t.merchantId ? merchantById[t.merchantId] : undefined;
              const label = m && !d.generic ? d.results[m.id]?.label : undefined;
              const counted = !t.excluded && m;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    disabled={!counted}
                    onClick={() => m && openSheet({ type: "merchant", id: m.id })}
                    className={`flex min-h-[68px] w-full items-center gap-3 rounded-row bg-white px-4 py-3 text-left ${counted ? "" : "opacity-60"}`}
                  >
                    <Monogram name={m?.name ?? "?"} label={label} />
                    <span className="min-w-0 flex-1">
                      <span className="caps block truncate text-label text-black">{m?.name ?? t.rawName}</span>
                      <span className="block truncate font-serif text-caption text-ink-2">
                        {counted ? t.rawName : "Not counted: transfer or income"}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="num text-label text-black">{money2(t.amount)}</span>
                      {counted ? (
                        <span className="font-serif text-micro text-ink-2">~{co2eOf(t)} kg</span>
                      ) : null}
                      {label && <StatusMarker label={label} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {groups.length === 0 && <p className="mt-8 text-center font-serif text-body text-ink-2">No transactions match.</p>}
    </Screen>
  );
}
