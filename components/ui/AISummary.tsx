"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

export function Shimmer({ lines = 3, label }: { lines?: number; label?: string }) {
  return (
    <div aria-live="polite">
      {label && <p className="mb-2 font-serif text-caption italic text-ink-2">{label}</p>}
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="shimmer-bar h-3.5 rounded-full" style={{ width: i === lines - 1 ? "62%" : "100%" }} />
        ))}
      </div>
    </div>
  );
}

function Typewriter({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(id);
          return v;
        }
        return Math.min(text.length, v + 2);
      });
    }, 16);
    return () => clearInterval(id);
  }, [text, reduce]);
  return (
    <>
      <span aria-hidden>{reduce ? text : text.slice(0, n)}</span>
      <span className="sr-only">{text}</span>
    </>
  );
}

/** "AI SUMMARY" label + italic serif text; shimmer while loading, then typewriter. */
export function AISummary({ text, loading, label = "AI summary" }: { text: string | null; loading: boolean; label?: string }) {
  return (
    <section className="rounded-row bg-cream px-4 py-4">
      <p className="caps mb-2 text-micro text-ink-2">{label}</p>
      <AnimatePresence mode="wait">
        {loading || !text ? (
          <motion.div key="s" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <Shimmer label="Writing summary" />
          </motion.div>
        ) : (
          <motion.p
            key="t"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="font-serif text-summary italic text-ink-2"
          >
            <Typewriter key={text} text={text} />
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}
