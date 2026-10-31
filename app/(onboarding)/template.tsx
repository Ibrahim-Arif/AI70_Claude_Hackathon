"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";

export default function OnboardingTemplate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const fade = path.startsWith("/loading");
  return (
    <motion.div
      className="absolute inset-0"
      initial={fade ? { opacity: 0 } : { opacity: 0, x: 48 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ x: { type: "spring", stiffness: 400, damping: 34 }, opacity: { duration: 0.3, ease: "easeOut" } }}
    >
      {children}
    </motion.div>
  );
}
