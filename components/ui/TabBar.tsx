"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, HomeIcon, PieChart, Search } from "./icons";

const TABS = [
  { href: "/home", label: "Dashboard", match: ["/home", "/report"], Icon: HomeIcon },
  { href: "/transactions", label: "Transactions", match: ["/transactions"], Icon: CreditCard },
  { href: "/spending", label: "Spending", match: ["/spending"], Icon: Bars },
  { href: "/budget", label: "Budget", match: ["/budget"], Icon: PieChart },
  { href: "/browse", label: "Browse", match: ["/browse"], Icon: Search },
];

function Bars({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
      <path d="M5 19V11M10 19V6M15 19v-9M20 19v-5" />
    </svg>
  );
}

export function TabBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="absolute inset-x-0 bottom-0 z-30 border-t border-hairline bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex h-[var(--tabbar-h)] items-stretch">
        {TABS.map((t) => {
          const active = t.match.some((m) => path.startsWith(m));
          return (
            <li key={t.href} className="flex-1">
              <Link href={t.href} aria-current={active ? "page" : undefined} className="block h-full">
                <motion.span
                  whileTap={{ scale: 0.94 }}
                  className="flex h-full flex-col items-center justify-center gap-0.5"
                >
                  <span className="relative flex h-8 w-12 items-center justify-center">
                    {active && (
                      <motion.span
                        layoutId="tab-pill"
                        className="absolute inset-0 rounded-pill bg-royal-tint"
                        transition={{ type: "spring", stiffness: 400, damping: 34 }}
                      />
                    )}
                    <span className={`relative ${active ? "text-royal" : "text-ink-2"}`}>
                      <t.Icon size={24} strokeWidth={1.9} />
                    </span>
                  </span>
                  <span className={`caps whitespace-nowrap text-[9px] tracking-[0.01em] ${active ? "text-royal" : "text-ink-2"}`}>{t.label}</span>
                </motion.span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
