"use client";

import { MotionConfig } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Overlays } from "./Overlays";
import { ToastHost } from "./ui/Toast";
import { useApp, useUI } from "@/lib/store";
import { runDemoJump, DEMO_KEYS } from "@/lib/demo";

const noopSubscribe = () => () => {};

const TAB_ROUTES = ["/home", "/spending", "/you", "/report"];

function useFrameScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => {
      if (window.innerWidth <= 500) return setScale(1);
      setScale(Math.min(1, (window.innerHeight - 32) / 844));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return scale;
}

export function AppShell({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const path = usePathname();
  const router = useRouter();
  const scale = useFrameScale();
  const withTabBar = TAB_ROUTES.some((r) => path.startsWith(r));

  // ?demo=1 opens the presenter panel
  useEffect(() => {
    if (!mounted) return;
    if (new URLSearchParams(window.location.search).get("demo") === "1") {
      useUI.getState().openSheet({ type: "demo" });
    }
  }, [mounted]);

  // Desktop keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "r") runDemoJump("reset", router);
      else if (key === "s") {
        const s = useApp.getState();
        const next = s.aiMode === "live" ? "scripted" : "live";
        s.set({ aiMode: next });
        useUI.getState().showToast(`AI mode: ${next === "live" ? "Live" : "Scripted"}`);
      } else if (DEMO_KEYS[key]) runDemoJump(DEMO_KEYS[key], router);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-dvh w-full items-center justify-center bg-cream">
        <div
          id="phone"
          style={scale !== 1 ? { transform: `scale(${scale})` } : undefined}
          className="relative h-dvh w-full overflow-hidden bg-cream min-[501px]:h-[844px] min-[501px]:w-[390px] min-[501px]:shrink-0 min-[501px]:rounded-frame min-[501px]:border min-[501px]:border-hairline min-[501px]:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25),0_8px_24px_-8px_rgba(0,0,0,0.12)]"
        >
          {mounted ? (
            <>
              {children}
              <Overlays />
              <ToastHost withTabBar={withTabBar} />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-[34px] tracking-[-0.02em] text-royal">Tally</span>
            </div>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}
