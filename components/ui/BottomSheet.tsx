"use client";

import { motion, useDragControls, type PanInfo } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

export const SHEET_SPRING = { type: "spring" as const, stiffness: 400, damping: 34 };

/**
 * White sheet, 28px top radius, grabber, spring open, drag down to dismiss,
 * 40% black scrim. Render inside <AnimatePresence>.
 */
export function BottomSheet({
  onClose,
  children,
  label,
  tall = false,
}: {
  onClose: () => void;
  children: ReactNode;
  label: string;
  tall?: boolean;
}) {
  const controls = useDragControls();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  return (
    <div className="absolute inset-0 z-40">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`absolute inset-x-0 bottom-0 flex flex-col rounded-t-sheet bg-white outline-none ${
          tall ? "max-h-[92%]" : "max-h-[88%]"
        }`}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={SHEET_SPRING}
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={onDragEnd}
      >
        <div
          className="flex h-7 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
          onPointerDown={(e) => controls.start(e)}
        >
          <span className="h-[5px] w-10 rounded-full bg-hairline" />
        </div>
        <motion.div
          layout
          transition={SHEET_SPRING}
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-[calc(24px+env(safe-area-inset-bottom))]"
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}
