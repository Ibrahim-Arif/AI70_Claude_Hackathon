import type { GenericSummary, Label } from "@/lib/types";

const COLORS: Record<Label, string> = {
  Aligned: "#3171DD",
  Mixed: "#D4962A",
  Conflicts: "#E05A2B",
  Unknown: "#7A7468",
};

/** 10px shape. Colors live only in the shape, never in text. */
export function StatusShape({ label, size = 10 }: { label: Label; size?: number }) {
  const c = COLORS[label];
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden className="shrink-0">
      {label === "Aligned" && <circle cx="5" cy="5" r="5" fill={c} />}
      {label === "Mixed" && (
        <>
          <circle cx="5" cy="5" r="4.25" fill="none" stroke={c} strokeWidth="1.5" />
          <path d="M5 0 A5 5 0 0 0 5 10 Z" fill={c} />
        </>
      )}
      {label === "Conflicts" && <path d="M5 0.5 L9.8 9.5 L0.2 9.5 Z" fill={c} />}
      {label === "Unknown" && (
        <circle cx="5" cy="5" r="4.1" fill="none" stroke={c} strokeWidth="1.5" strokeDasharray="2 1.6" />
      )}
    </svg>
  );
}

export function StatusMarker({ label }: { label: Label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusShape label={label} />
      <span className="font-serif text-status text-ink-2">{label}</span>
    </span>
  );
}

export function StatusPill({ label, generic }: { label?: Label; generic?: GenericSummary }) {
  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-full bg-fill px-3.5">
      {label && <StatusShape label={label} />}
      <span className="font-serif text-status text-ink-2">{label ?? generic}</span>
    </span>
  );
}

export function GenericWord({ word }: { word: GenericSummary }) {
  return <span className="font-serif text-status text-ink-2">{word}</span>;
}
