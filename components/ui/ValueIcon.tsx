import { catalogById } from "@/lib/values";
import { Plus, Sparkle, VALUE_ICONS } from "./icons";

/** Each value gets its own tint + stroke color so the lists feel alive. */
export const VALUE_TONES: Record<string, { bg: string; fg: string }> = {
  climate: { bg: "#E4EDFB", fg: "#2D6FD6" },
  labor: { bg: "#FBF1CC", fg: "#9A7400" },
  political: { bg: "#E6EAFA", fg: "#1D3BC4" },
  privacy: { bg: "#FBE5DC", fg: "#E05A2B" },
  animal: { bg: "#FBF1CC", fg: "#9A7400" },
  local: { bg: "#E6EAFA", fg: "#1D3BC4" },
};
const CUSTOM_TONE = { bg: "#FBE5DC", fg: "#E05A2B" };

export function valueTone(id: string) {
  return VALUE_TONES[id] ?? CUSTOM_TONE;
}

export function ValueIcon({ id, size = 44 }: { id: string; size?: number }) {
  const tone = valueTone(id);
  const entry = catalogById[id];
  const Icon = entry ? VALUE_ICONS[entry.icon] : Sparkle;
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-tile"
      style={{ width: size, height: size, backgroundColor: tone.bg, color: tone.fg, boxShadow: "0 0 0 2px #FFFFFF" }}
    >
      <Icon size={Math.round(size * 0.52)} strokeWidth={2} />
    </span>
  );
}

export function AddTile() {
  return (
    <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-tile bg-royal-tint text-royal">
      <Plus size={22} strokeWidth={2.2} />
    </span>
  );
}
