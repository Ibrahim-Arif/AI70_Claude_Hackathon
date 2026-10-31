"use client";

import type { ReactNode } from "react";

/** Scrollable screen body inside the phone frame. */
export function Screen({
  children,
  tabs = false,
  className = "",
  footer,
}: {
  children: ReactNode;
  tabs?: boolean;
  className?: string;
  /** pinned bottom area (onboarding CTA) */
  footer?: ReactNode;
}) {
  return (
    <div className="absolute inset-0 flex flex-col" style={tabs ? { bottom: "calc(var(--tabbar-h) + env(safe-area-inset-bottom))" } : undefined}>
      <main
        className={`no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pt-[calc(16px+env(safe-area-inset-top))] ${
          footer ? "pb-6" : "pb-8"
        } ${className}`}
      >
        {children}
      </main>
      {footer && <div className="shrink-0 px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3">{footer}</div>}
    </div>
  );
}
