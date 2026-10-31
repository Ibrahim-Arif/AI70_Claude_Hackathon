import { Bag, Car, Cup, Fork, Leaf, Repeat, Store } from "../ui/icons";

const MAP = { Coffee: Cup, "Dining out": Fork, Shopping: Bag, "Getting around": Car, Subscriptions: Repeat, Groceries: Store, Other: Store } as const;

/** One recognisable glyph per category, in a soft tile, so cards scan without reading. */
export function CategoryIcon({ name, size = 44 }: { name: string; size?: number }) {
  const Icon = (MAP as Record<string, typeof Cup>)[name] ?? Leaf;
  return (
    <span className="flex shrink-0 items-center justify-center rounded-row bg-royal-tint text-royal" style={{ width: size, height: size }} aria-hidden>
      <Icon size={Math.round(size * 0.52)} strokeWidth={2} />
    </span>
  );
}
