"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Screen } from "@/components/Screen";
import { PrimaryButton } from "@/components/ui/Buttons";
import { Wordmark } from "@/components/ui/Wordmark";
import { useApp } from "@/lib/store";

/** The intro plays once per page load, not every time someone comes back to this screen. */
let introPlayed = false;

const INTRO_MS = 3200;

/** A highlighter swipe behind a few words, drawn left to right once the page appears. */
function Mark({ children, delay }: { children: string; delay: number }) {
  const reduce = useReducedMotion();
  // Wait for the intro to finish on first load; start sooner when coming back to this screen.
  const lead = introPlayed ? 0.2 : INTRO_MS / 1000;
  return (
    <motion.span
      className="rounded-[4px] px-1 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
      style={{ backgroundImage: "linear-gradient(rgba(29,59,196,0.3), rgba(29,59,196,0.3))", backgroundRepeat: "no-repeat", backgroundPosition: "left center" }}
      initial={{ backgroundSize: reduce ? "100% 100%" : "0% 100%" }}
      animate={{ backgroundSize: "100% 100%" }}
      transition={{ delay: reduce ? 0 : delay + lead, duration: 0.7, ease: "easeOut" }}
    >
      {children}
    </motion.span>
  );
}

function Intro() {
  return (
    <motion.div
      key="intro"
      className="absolute inset-0 z-40 flex flex-col bg-royal px-6 pt-[calc(16px+env(safe-area-inset-top))] text-white"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.55, ease: "easeInOut" }}
    >
      <div>
        <Wordmark light />
      </div>
      <div className="flex flex-1 flex-col justify-center pb-24">
        <motion.p
          className="head text-[40px] leading-[44px]"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
        >
          Your money goes somewhere.
        </motion.p>
        <motion.p
          className="head mt-3 text-[64px] leading-[64px] [-webkit-text-stroke:0.035em_currentColor]"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 1.3, duration: 0.8, ease: "easeOut" }}
        >
          Know where.
        </motion.p>
      </div>
    </motion.div>
  );
}

export default function StartPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const stored = useApp((s) => s.name);
  const set = useApp((s) => s.set);
  const [name, setName] = useState(stored);
  const [intro, setIntro] = useState(!introPlayed);
  const ok = name.trim().length > 0;

  useEffect(() => {
    if (!intro) return;
    introPlayed = true;
    const t = setTimeout(() => setIntro(false), reduce ? 0 : INTRO_MS);
    return () => clearTimeout(t);
  }, [intro, reduce]);

  const go = () => {
    if (!ok) return;
    set({ name: name.trim() });
    router.push("/values");
  };

  return (
    <>
      <Screen
        className="flex flex-col"
        footer={
          <PrimaryButton disabled={!ok} onClick={go}>
            Continue
          </PrimaryButton>
        }
      >
        <div>
          <Wordmark />
        </div>
        <motion.div
          className="flex flex-1 flex-col justify-center pb-16"
          initial={{ opacity: 0, y: 16 }}
          animate={intro ? { opacity: 0, y: 16 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
        >
          <p className="font-serif text-[28px] leading-[40px] text-black">
            See the companies behind your purchases, what they <Mark delay={0.9}>stand for</Mark>, and what your spending{" "}
            <Mark delay={1.3}>supports</Mark>.
          </p>
          <form
            className="mt-12"
            onSubmit={(e) => {
              e.preventDefault();
              go();
            }}
          >
            <label htmlFor="first-name" className="caps block text-label text-ink-2">
              First name
            </label>
            <input
              id="first-name"
              autoComplete="given-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 h-14 w-full rounded-row border border-hairline bg-white px-4 font-serif text-body text-black outline-none focus:border-black"
              enterKeyHint="go"
            />
          </form>
        </motion.div>
      </Screen>
      <AnimatePresence>{intro && <Intro />}</AnimatePresence>
    </>
  );
}
