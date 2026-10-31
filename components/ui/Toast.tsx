"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUI } from "@/lib/store";

export function ToastHost({ withTabBar }: { withTabBar: boolean }) {
  const toast = useUI((s) => s.toast);
  const hide = useUI((s) => s.hideToast);
  const router = useRouter();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hide, 3000);
    return () => clearTimeout(t);
  }, [toast, hide]);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-50 flex justify-center px-6"
      style={{ bottom: withTabBar ? "calc(var(--tabbar-h) + 12px + env(safe-area-inset-bottom))" : "calc(24px + env(safe-area-inset-bottom))" }}
      aria-live="polite"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="pointer-events-auto flex min-h-12 w-full items-center justify-between gap-3 rounded-toast bg-black px-4 py-2"
            role="status"
          >
            <span className="font-serif text-caption text-white">{toast.text}</span>
            {toast.action && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  toast.action?.onClick?.();
                  router.push(toast.action!.href);
                  hide();
                }}
                className="caps min-h-11 shrink-0 px-2 text-label text-white underline underline-offset-4"
              >
                {toast.action.label}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
