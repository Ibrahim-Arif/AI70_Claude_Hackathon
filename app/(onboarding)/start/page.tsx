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
        <HalftoneCompass size={230} />
      </motion.div>
      <h1 className="head mt-8 text-h1 text-black">See who your money reaches</h1>
      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        <label htmlFor="first-name" className="block font-serif text-body text-ink-2">
          What should we call you?
        </label>
        <span className="caps mt-5 block text-label text-ink-2" aria-hidden>
          First name
        </span>
        <input
          id="first-name"
          autoComplete="given-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 h-14 w-full rounded-row border border-hairline bg-white px-4 font-serif text-body text-black outline-none placeholder:text-ink-3 focus:border-black"
          placeholder="Maya"
          enterKeyHint="go"
        />
      </form>
    </Screen>
  );
}
