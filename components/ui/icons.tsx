import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
}

export const ChevronLeft = (p: P) => (
  <svg {...base(p)}><path d="M15 5l-7 7 7 7" /></svg>
);
export const ChevronRight = (p: P) => (
  <svg {...base(p)}><path d="M9 5l7 7-7 7" /></svg>
);
export const Check = (p: P) => (
  <svg {...base(p)}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const ArrowUp = (p: P) => (
  <svg {...base(p)}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
);
export const ArrowDown = (p: P) => (
  <svg {...base(p)}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
);
export const Gear = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);
export const ExternalLink = (p: P) => (
  <svg {...base(p)}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
);
export const Sparkle = (p: P) => (
  <svg {...base(p)}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16z" /></svg>
);
export const Plus = (p: P) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const Leaf = (p: P) => (
  <svg {...base(p)}><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14M5 19l7-7" /></svg>
);
export const Hands = (p: P) => (
  <svg {...base(p)}><path d="M3 13l4-4 3 2 3-3 4 4M7 9v6l4 4h3l5-5M13 8l3-3 5 5-3 3" /></svg>
);
export const Columns = (p: P) => (
  <svg {...base(p)}><path d="M3 9l9-5 9 5M5 9v9M10 9v9M14 9v9M19 9v9M3 20h18" /></svg>
);
export const Lock = (p: P) => (
  <svg {...base(p)}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
export const Paw = (p: P) => (
  <svg {...base(p)}>
    <circle cx="7" cy="10" r="1.6" /><circle cx="11" cy="6.5" r="1.6" /><circle cx="15.5" cy="7" r="1.6" /><circle cx="18" cy="11" r="1.6" />
    <path d="M8.5 17c0-2.5 2-5 4-5s4.5 2.5 4.5 5c0 1.7-1.5 2.5-3 2-1-.3-2-.3-3 0-1.5.5-2.5-.3-2.5-2z" />
  </svg>
);
export const Store = (p: P) => (
  <svg {...base(p)}><path d="M4 9l1.5-5h13L20 9M4 9h16M4 9v11h16V9M9 20v-6h6v6" /></svg>
);
export const Shield = (p: P) => (
  <svg {...base(p)}><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3z" /></svg>
);
export const Trash = (p: P) => (
  <svg {...base(p)}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
);
export const Bank = (p: P) => (
  <svg {...base(p)}><path d="M3 9l9-5 9 5M5 10v7M10 10v7M14 10v7M19 10v7M3 20h18" /></svg>
);
export const Download = (p: P) => (
  <svg {...base(p)}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
);

export const VALUE_ICONS = { leaf: Leaf, hands: Hands, columns: Columns, lock: Lock, paw: Paw, store: Store };

export const Bell = (p: P) => (
  <svg {...base(p)}><path d="M6 17V11a6 6 0 1 1 12 0v6l1.5 2h-15L6 17zM10 21h4" /></svg>
);
export const Search = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
);
export const CreditCard = (p: P) => (
  <svg {...base(p)}><rect x="3" y="6" width="18" height="12" rx="2.5" /><path d="M3 10h18M7 15h3" /></svg>
);
export const PieChart = (p: P) => (
  <svg {...base(p)}><path d="M12 3a9 9 0 1 0 9 9h-9V3z" /><path d="M15 3.5A9 9 0 0 1 20.5 9H15V3.5z" /></svg>
);
export const HomeIcon = (p: P) => (
  <svg {...base(p)}><path d="M4 11l8-6 8 6v9H4z" /><path d="M10 20v-5h4v5" /></svg>
);

/** Four strokes and the slash: an actual tally mark. */
export const TallyMarks = (p: P) => (
  <svg {...base(p)}><path d="M6 5v14M10 5v14M14 5v14M18 5v14M3.5 16.5l17-9" /></svg>
);

export const Cup = (p: P) => (
  <svg {...base(p)}><path d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8zM16 9.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2M12 3.5v2" /></svg>
);
export const Fork = (p: P) => (
  <svg {...base(p)}><path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M7 3v5M15 21V3c2 1.5 3 4 3 7h-3" /></svg>
);
export const Bag = (p: P) => (
  <svg {...base(p)}><path d="M5 8h14l-1 12H6L5 8zM9 8V6a3 3 0 0 1 6 0v2" /></svg>
);
export const Car = (p: P) => (
  <svg {...base(p)}><path d="M4 15v-3l2-5h12l2 5v3H4zM4 15v3M20 15v3M7 12h10" /><circle cx="8" cy="15" r="0.6" /><circle cx="16" cy="15" r="0.6" /></svg>
);
export const Repeat = (p: P) => (
  <svg {...base(p)}><path d="M4 11V9a3 3 0 0 1 3-3h11l-3-3M20 13v2a3 3 0 0 1-3 3H6l3 3" /></svg>
);
export const Close = (p: P) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const Doc = (p: P) => (
  <svg {...base(p)}><path d="M7 3h7l4 4v14H7V3zM14 3v4h4M9.5 12h5M9.5 16h5" /></svg>
);
export const Info = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.2" /></svg>
);
export const ArrowRight = (p: P) => (
  <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const Eye = (p: P) => (
  <svg {...base(p)}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></svg>
);
