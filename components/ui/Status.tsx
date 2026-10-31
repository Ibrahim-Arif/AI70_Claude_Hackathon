import type { GenericSummary, Label } from "@/lib/types";

const COLORS: Record<Label, string> = {
  Aligned: "#1D3BC4",
  Mixed: "#F2C12E",
  Conflicts: "#E05A2B",
  Unknown: "#75726B",
};

/** 10px shape. Colors live only in the shape, never in text. */
export const LABEL_TINT: Record<Label, string> = {
  Aligned: "#E6EAFA",
  Mixed: "#FBF1CC",
  Conflicts: "#FBE5DC",
  Unknown: "#EDEBE7",
};

export function StatusShape({ label, size = 10, onDark = false }: { label: Label; size?: number; onDark?: boolean }) {
  const c = onDark && label === "Aligned" ? "#FFFFFF" : COLORS[label];
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

export function StatusPill({ label, generic, white = false }: { label?: Label; generic?: GenericSummary; white?: boolean }) {
  return (
    <span
      className="inline-flex h-8 shrink-0 items-center gap-2 rounded-pill px-3.5"
      style={{ backgroundColor: white ? "#FFFFFF" : label ? LABEL_TINT[label] : "#EDEBE7" }}
    >
      {label && <StatusShape label={label} />}
      <span className="font-serif text-status text-ink-2">{label ?? generic}</span>
    </span>
  );
}

export function GenericWord({ word }: { word: GenericSummary }) {
  return <span className="font-serif text-status text-ink-2">{word}</span>;
}
