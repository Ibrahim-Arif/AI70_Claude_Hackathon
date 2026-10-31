"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PrimaryButton, SecondaryButton } from "../ui/Buttons";
import { Shimmer } from "../ui/AISummary";
import { ChevronRight } from "../ui/icons";
import { parsePreference } from "@/lib/ai/client";
import type { ParseResponse } from "@/lib/ai/schemas";
import { useApp, useUI } from "@/lib/store";
import { changeValues } from "@/lib/notify";
import type { Preference } from "@/lib/types";

type Phase = "input" | "understanding" | "answer";

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: "easeOut" as const },
};

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

export function AddSheet() {
  const aiMode = useApp((s) => s.aiMode);
  const addCustom = useApp((s) => s.addCustom);
  const close = useUI((s) => s.closeSheet);
  const path = usePathname();
  const initialText = useUI((s) => (s.sheet?.type === "add" ? s.sheet.text ?? "" : ""));
  const [text, setText] = useState(initialText);
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const [phase, setPhase] = useState<Phase>("input");
  const [res, setRes] = useState<ParseResponse | null>(null);

  const run = async (h: { q: string; a: string }[]) => {
    setPhase("understanding");
    const r = await parsePreference(text.trim(), h, aiMode);
    setRes(r);
    setPhase("answer");
  };

  useEffect(() => {
    if (!initialText) return;
    const t = setTimeout(() => void run([]), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const edit = () => {
    setHistory([]);
    setRes(null);
    setPhase("input");
  };

  const add = (pref: Omit<Preference, "importance">) => {
    if (path.startsWith("/you")) {
      close();
      useApp.getState().set({ mode: "values" });
      changeValues(() => addCustom(pref), `Added ${pref.label}`);
    } else {
      addCustom(pref);
      close();
    }
  };

  return (
    <div className="pt-2">
      <AnimatePresence mode="wait">
        {phase === "input" && (
          <motion.div key="input" {...fade}>
            <h2 className="head text-h2 text-black">Add your own</h2>
            <label htmlFor="own-words" className="mt-2 block font-serif text-body text-ink-2">
              Tell us in your own words.
            </label>
            <textarea
              id="own-words"
              autoFocus
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="I prefer not to eat at fast food chains"
              className="mt-5 w-full resize-none rounded-row border border-hairline bg-white p-4 font-serif text-body text-black outline-none placeholder:text-ink-3 focus:border-black"
            />
            <PrimaryButton className="mt-5" disabled={!text.trim()} onClick={() => run([])}>
              Continue
            </PrimaryButton>
          </motion.div>
        )}

        {phase === "understanding" && (
          <motion.div key={`u-${history.length}`} {...fade} className="py-4">
            <p className="caps mb-4 text-label text-ink-2">Understanding…</p>
            <Shimmer lines={3} />
            <p className="mt-6 font-serif text-body italic text-ink-2">&ldquo;{text.trim()}&rdquo;</p>
          </motion.div>
        )}

        {phase === "answer" && res?.status === "clarify" && (
          <motion.div key={`c-${history.length}`} {...fade}>
            <div className="flex items-center justify-between">
              <p className="caps text-label text-ink-2">Quick question</p>
              {res.progress && (
                <p className="caps text-label text-ink-2">
                  {res.progress.step} of {res.progress.total}
                </p>
              )}
            </div>
            <h2 className="head mt-3 text-h2 text-black">{res.question}</h2>
            <div className="mt-6 flex flex-col gap-3">
              {res.options.map((o) => (
                <motion.button
                  key={o}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const h = [...history, { q: res.question, a: o }];
                    setHistory(h);
                    run(h);
                  }}
                  className="flex min-h-16 w-full items-center justify-between gap-3 rounded-row bg-royal-tint px-5 py-3 text-left"
                >
                  <span className="caps text-label text-black">{o}</span>
                  <ChevronRight size={18} />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {phase === "answer" && res?.status === "result" && (
          <motion.div key="result" {...fade}>
            <p className="caps text-label text-ink-2">We understood</p>
            <h2 className="head mt-3 text-h2 text-black">{res.preference.label}</h2>
            <p className="mt-2 font-serif text-caption text-ink-2">{res.basis}</p>
            <p className="mt-4 font-serif text-body text-black">{res.summary}</p>
            <p className="mt-4 border-l-2 border-hairline pl-4 font-serif text-body italic text-ink-2">&ldquo;{text.trim()}&rdquo;</p>
            <div className="mt-7 flex flex-col gap-3">
              <PrimaryButton
                onClick={() =>
                  add({
                    ...res.preference,
                    id: res.preference.id ?? `custom-${slug(res.preference.label)}`,
                    sourceText: text.trim(),
                    clarifications: history,
                  } as Omit<Preference, "importance">)
                }
              >
                Add
              </PrimaryButton>
              <SecondaryButton onClick={edit}>Edit</SecondaryButton>
            </div>
          </motion.div>
        )}

        {phase === "answer" && res && (res.status === "unsupported" || res.status === "declined" || res.status === "failed") && (
          <motion.div key={res.status} {...fade}>
            <p className="caps text-label text-ink-2">
              {res.status === "unsupported" ? "Not tracked yet" : res.status === "declined" ? "A different approach" : "Let's try again"}
            </p>
            <h2 className="head mt-3 text-h2 text-black">
              {res.status === "unsupported" ? res.label : res.status === "declined" ? "We can't filter that way" : "We couldn't read that"}
            </h2>
            <p className="mt-4 font-serif text-body text-black">{res.message}</p>
            <p className="mt-4 border-l-2 border-hairline pl-4 font-serif text-body italic text-ink-2">&ldquo;{text.trim()}&rdquo;</p>
            <div className="mt-7 flex flex-col gap-3">
              {res.status === "unsupported" && (
                <PrimaryButton
                  onClick={() => add({ id: `custom-${slug(res.label)}`, label: res.label, type: "unsupported", sourceText: text.trim() })}
                >
                  Add
                </PrimaryButton>
              )}
              {res.status === "declined" && <PrimaryButton onClick={close}>Got it</PrimaryButton>}
              <SecondaryButton onClick={edit}>Edit</SecondaryButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
