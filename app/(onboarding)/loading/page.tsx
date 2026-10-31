"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { HalftoneCompass } from "@/components/ui/HalftoneCompass";
import { Check } from "@/components/ui/icons";
import { Wordmark } from "@/components/ui/Wordmark";
import { merchantById, merchants, parentName, hasDifferentParent } from "@/data/merchants";
import { resolveMerchantId } from "@/data/transactions";
import { useApp } from "@/lib/store";

const DESCRIPTORS = [
  "AMZN MKTP US*2K4",
  "WHOLEFDS MKT #10234",
  "SQ *BLUE BOTTLE",
  "SHELL OIL 57442",
  "TST* JUNIPER THAI",
  "UBER *TRIP",
];

const CARD_MS = 420;
const STATUS = ["Mapping parent companies", "Checking ratings", "Applying your values"];
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789*#&";

function Scramble({ from, to }: { from: string; to: string }) {
  const reduce = useReducedMotion();
  const [text, setText] = useState(from);
  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    let cleanup = () => {};
    const start = setTimeout(() => {
      const id = setInterval(() => {
        frame++;
        const p = frame / 14;
        const len = Math.round(from.length + (to.length - from.length) * Math.min(1, p));
        let out = "";
        for (let i = 0; i < len; i++) {
          out += i / len < p ? (to[i] ?? "") : CHARS[(i * 7 + frame * 13) % CHARS.length];
        }
        setText(out);
        if (p >= 1) {
          clearInterval(id);
          setText(to);
        }
      }, 30);
      cleanup = () => clearInterval(id);
    }, 160);
    return () => {
      clearTimeout(start);
      cleanup();
    };
  }, [from, to, reduce]);
  return <>{reduce ? to : text}</>;
}

export default function LoadingPage() {
  const router = useRouter();
  const set = useApp((s) => s.set);
  const generic = useApp((s) => s.mode === "generic");
  const [i, setI] = useState(0);
  const [checks, setChecks] = useState(0);
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    set({ onboarded: true });
    router.replace("/home");
  }, [router, set]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    DESCRIPTORS.forEach((_, k) => k && timers.push(setTimeout(() => setI(k), k * CARD_MS)));
    const cardsEnd = DESCRIPTORS.length * CARD_MS;
    STATUS.forEach((_, k) => timers.push(setTimeout(() => setChecks(k + 1), cardsEnd + 150 + k * 240)));
    timers.push(setTimeout(finish, cardsEnd + 150 + STATUS.length * 240 + 350));
    return () => timers.forEach(clearTimeout);
  }, [finish]);

  const raw = DESCRIPTORS[i];
  const m = merchantById[resolveMerchantId(raw) ?? ""];
  const statuses = generic ? [...STATUS.slice(0, 2), "Summarizing ratings"] : STATUS;

  return (
    <div
      className="absolute inset-0 flex cursor-pointer flex-col bg-royal px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]"
      onClick={finish}
      role="button"
      tabIndex={0}
      aria-label="Finding who's behind your purchases. Tap to skip."
      onKeyDown={(e) => e.key === "Enter" && finish()}
    >
      <div onClick={(e) => e.stopPropagation()} className="self-start">
        <Wordmark light />
      </div>
      <div className="mt-4 flex justify-center">
        <HalftoneCompass size={150} color="#FFFFFF" spin />
      </div>
      <h1 className="head mt-6 text-h1 text-white">Finding who&apos;s behind your purchases</h1>

      <div className="mt-7 h-[104px] rounded-card bg-white px-[22px] py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={raw}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <p className="caps truncate text-row text-black">
              <Scramble from={raw} to={m?.name.toUpperCase() ?? raw} />
            </p>
            {m && hasDifferentParent(m) ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="mt-1 font-serif text-caption text-ink-2"
              >
                Owned by {parentName(m)}
              </motion.p>
            ) : (
              <p className="mt-1 font-serif text-caption text-ink-2">{m?.category}</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mt-4 font-serif text-caption text-white" aria-live="polite">
        Matched <span className="num"><CountUp to={merchants.length} ease="linear" duration={(DESCRIPTORS.length * CARD_MS) / 1000} /></span> of{" "}
        {merchants.length} merchants
      </p>

      <ul className="mt-auto flex flex-col gap-3 pb-2">
        {statuses.map((s, k) => (
          <li key={s} className="flex items-center gap-3">
            <span className="relative flex h-6 w-6 items-center justify-center rounded-full border border-white/60">
              <AnimatePresence>
                {checks > k && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 24 }}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-white text-royal"
                  >
                    <Check size={14} strokeWidth={2.8} />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            <span className="font-serif text-caption text-white">
              {s}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center font-serif text-caption text-white">Tap anywhere to skip</p>
    </div>
  );
}
