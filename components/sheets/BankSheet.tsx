"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bank, ChevronRight } from "../ui/icons";
import { useUI } from "@/lib/store";

export function AnimatedCheck({ size = 72 }: { size?: number }) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 72 72" aria-hidden initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
      <circle cx="36" cy="36" r="36" fill="#1D3BC4" />
      <motion.path
        d="M22 37l10 10 19-21"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
      />
    </motion.svg>
  );
}

export function BankSheet() {
  const router = useRouter();
  const close = useUI((s) => s.closeSheet);
  const [step, setStep] = useState<"pick" | "connecting" | "done">("pick");

  useEffect(() => {
    if (step === "connecting") {
      const t = setTimeout(() => setStep("done"), 700);
      return () => clearTimeout(t);
    }
    if (step === "done") {
      const t = setTimeout(() => {
        close();
        router.push("/loading");
      }, 450);
      return () => clearTimeout(t);
    }
  }, [step, close, router]);

  return (
    <div className="min-h-[340px] pt-2">
      <p className="caps text-label text-ink-2">Demo bank connection</p>
      <AnimatePresence mode="wait">
        {step === "pick" && (
          <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <h2 className="head mt-3 text-h2 text-black">Choose your bank</h2>
            <p className="mt-2 font-serif text-caption text-ink-2">No real account is used. This is mock data for the demo.</p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep("connecting")}
              className="mt-6 flex min-h-[76px] w-full items-center gap-4 rounded-row bg-fill px-5 text-left"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-tile bg-icon-tile">
                <Bank size={22} />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="caps text-row text-black">Demo Bank</span>
                <span className="font-serif text-caption text-ink-2">Checking and credit card</span>
              </span>
              <ChevronRight size={20} />
            </motion.button>
          </motion.div>
        )}
        {step === "connecting" && (
          <motion.div key="connecting" className="flex flex-col items-center pt-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <span className="h-14 w-14 animate-spin-slow rounded-full border-4 border-fill border-t-royal" aria-hidden />
            <p className="mt-6 font-serif text-body text-ink-2" aria-live="polite">Connecting securely…</p>
          </motion.div>
        )}
        {step === "done" && (
          <motion.div key="done" className="flex flex-col items-center pt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AnimatedCheck />
            <p className="caps mt-6 text-label text-black" aria-live="polite">Connected</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
