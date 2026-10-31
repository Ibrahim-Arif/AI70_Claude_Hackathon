"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "./icons";

type BtnProps = HTMLMotionProps<"button"> & { variant?: "royal" | "inverted" };

const pill =
  "caps h-[60px] w-full rounded-full text-btn flex items-center justify-center gap-2 select-none disabled:cursor-not-allowed";

export function PrimaryButton({ variant = "royal", className = "", disabled, ...rest }: BtnProps) {
  const colors =
    variant === "inverted"
      ? "bg-white text-royal"
      : disabled
        ? "bg-fill text-ink-2"
        : "bg-royal text-white";
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.98 }}
      disabled={disabled}
      className={`${pill} ${colors} transition-colors duration-300 ${className}`}
      {...rest}
    />
  );
}

export function SecondaryButton({ className = "", ...rest }: HTMLMotionProps<"button">) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      className={`${pill} bg-fill text-black ${className}`}
      {...rest}
    />
  );
}

/** Text-only link-style button (royal). Only place on white surfaces for contrast. */
export function LinkButton({ className = "", ...rest }: HTMLMotionProps<"button">) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      className={`font-serif text-body text-royal underline-offset-4 hover:underline min-h-11 px-2 ${className}`}
      {...rest}
    />
  );
}

export function BackButton({ onClick, light = false }: { onClick?: () => void; light?: boolean }) {
  const router = useRouter();
  return (
    <motion.button
      type="button"
      aria-label="Back"
      whileTap={{ scale: 0.92 }}
      onClick={onClick ?? (() => router.back())}
      className={`-ml-2.5 flex h-11 w-11 items-center justify-center rounded-full ${light ? "text-white" : "text-black"}`}
    >
      <ChevronLeft size={24} />
    </motion.button>
  );
}

/** Generic pressable wrapper with scale feedback. */
export function Pressable({ className = "", ...rest }: HTMLMotionProps<"button">) {
  return <motion.button type="button" whileTap={{ scale: 0.98 }} className={className} {...rest} />;
}
