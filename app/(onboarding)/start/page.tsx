"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Screen } from "@/components/Screen";
import { PrimaryButton } from "@/components/ui/Buttons";
import { HalftoneCompass } from "@/components/ui/HalftoneCompass";
import { Wordmark } from "@/components/ui/Wordmark";
import { useApp } from "@/lib/store";

export default function StartPage() {
  const router = useRouter();
  const stored = useApp((s) => s.name);
  const set = useApp((s) => s.set);
  const [name, setName] = useState(stored);
  const ok = name.trim().length > 0;

  const go = () => {
    if (!ok) return;
    set({ name: name.trim() });
    router.push("/values");
  };

  return (
    <Screen
      footer={
        <PrimaryButton disabled={!ok} onClick={go}>
          Continue
        </PrimaryButton>
      }
    >
      <Wordmark />
      <motion.div
        className="mt-6 flex justify-center"
        initial={{ opacity: 0, scale: 0.92, rotate: -20 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      >
        <HalftoneCompass size={230} color="#1D3BC4" accent="#2D6FD6" />
      </motion.div>
      <h1 className="head mt-8 text-h1 text-black">
        Your money goes somewhere.
        <span className="mt-1 block text-royal [-webkit-text-stroke:0.035em_currentColor]">Know where.</span>
      </h1>
      <p className="mt-3 font-serif text-body text-ink-2">
        See the companies behind your purchases, what they stand for, and what your spending supports.
      </p>
      <form
        className="mt-6"
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
          className="mt-2 h-14 w-full rounded-row border border-hairline bg-white px-4 font-serif text-body text-black outline-none placeholder:text-ink-3 focus:border-black"
          enterKeyHint="go"
        />
      </form>
    </Screen>
  );
}
