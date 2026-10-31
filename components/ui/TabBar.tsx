"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home", label: "Home", match: ["/home", "/report"] },
  { href: "/spending", label: "Spending", match: ["/spending"] },
  { href: "/you", label: "Values", match: ["/you"] },
];

function TabIcon({ i, active }: { i: number; active: boolean }) {
  const c = active ? "#3171DD" : "#4A453D";
  const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (i === 0) return <svg {...common}><path d="M4 11l8-6 8 6v9H4z" /><path d="M10 20v-5h4v5" /></svg>;
  if (i === 1) return <svg {...common}><path d="M5 19V11M10 19V6M15 19v-9M20 19v-5" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M14.8 9.2l-1.6 4-4 1.6 1.6-4z" /></svg>;
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
        {TABS.map((t, i) => {
          const active = t.match.some((m) => path.startsWith(m));
          return (
            <li key={t.href} className="flex-1">
              <Link href={t.href} aria-current={active ? "page" : undefined} className="block h-full">
                <motion.span
                  whileTap={{ scale: 0.94 }}
                  className="flex h-full flex-col items-center justify-center gap-0.5"
                >
                  <span className="relative flex h-8 w-14 items-center justify-center">
                    {active && (
                      <motion.span
                        layoutId="tab-pill"
                        className="absolute inset-0 rounded-full bg-royal-tint"
                        transition={{ type: "spring", stiffness: 400, damping: 34 }}
                      />
                    )}
                    <span className="relative">
                      <TabIcon i={i} active={active} />
                    </span>
                  </span>
                  <span className={`caps text-tab ${active ? "text-royal" : "text-ink-2"}`}>{t.label}</span>
                </motion.span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
