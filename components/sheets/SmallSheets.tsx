"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PrimaryButton, SecondaryButton } from "../ui/Buttons";
import { Download, Trash } from "../ui/icons";
import { SegmentedControl } from "../ui/SegmentedControl";
import { DEMO_JUMPS, runDemoJump } from "@/lib/demo";
import { karmaCredits } from "@/lib/engine";
import { useApp, useUI, type AIMode } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";

export function HowCalcSheet() {
  return (
    <div className="pt-2">
      <h2 className="head text-h2 text-black">How we calculate</h2>
      <p className="mt-4 font-serif text-body text-black">
        Aligned spend ÷ rated spend. Unknown spend is shown separately and never counted as aligned.
      </p>
      <p className="mt-4 font-serif text-caption text-ink-2">
        Labels come from fixed rules you can see, not from AI. Ratings are illustrative demo data.
      </p>
    </div>
  );
}

export function SettingsSheet() {
  const router = useRouter();
  const reset = useApp((s) => s.reset);
  const close = useUI((s) => s.closeSheet);
  const [confirm, setConfirm] = useState(false);

  const exportData = () => {
    const state = useApp.getState();
    const data = Object.fromEntries(Object.entries(state).filter(([, v]) => typeof v !== "function"));
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tally-data.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="pt-2">
      <h2 className="head text-h2 text-black">Settings</h2>
      <p className="caps mt-6 text-label text-ink-2">Privacy</p>
      <p className="mt-2 font-serif text-body text-black">
        Your spending and values are encrypted, deletable in one tap, and never sold or shared for advertising.
      </p>
      {!confirm ? (
        <div className="mt-8 flex flex-col gap-3">
          <SecondaryButton
            onClick={() => {
              close();
              router.push("/you");
            }}
          >
            Your values
          </SecondaryButton>
          <SecondaryButton onClick={exportData}>
            <Download size={18} /> Export data
          </SecondaryButton>
          <SecondaryButton onClick={() => setConfirm(true)}>
            <Trash size={18} /> Delete all data
          </SecondaryButton>
        </div>
      ) : (
        <div className="mt-8">
          <p className="font-serif text-body text-black">Delete everything? This resets the app and can&apos;t be undone.</p>
          <div className="mt-5 flex gap-3">
            <SecondaryButton className="flex-1" onClick={() => setConfirm(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              className="flex-1"
              onClick={() => {
                reset();
                close();
                router.replace("/start");
              }}
            >
              Delete
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

export function DemoPanel() {
  const router = useRouter();
  const aiMode = useApp((s) => s.aiMode);
  const set = useApp((s) => s.set);
  const fill = useApp((s) => s.fillPersona);
  const close = useUI((s) => s.closeSheet);
  const [status, setStatus] = useState<{ hasKey: boolean; model: string } | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ hasKey: false, model: "" }));
  }, []);

  return (
    <div className="pt-2">
      <h2 className="head text-h2 text-black">Demo panel</h2>
      <p className="mt-1 font-serif text-caption text-ink-2">Keys on desktop: R reset, 0 to 9 jump, S toggle scripted AI.</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <SecondaryButton onClick={() => runDemoJump("reset", router)}>Reset demo</SecondaryButton>
        <SecondaryButton
          onClick={() => {
            fill("important");
            close();
            router.push("/home");
          }}
        >
          Fill Maya
        </SecondaryButton>
      </div>

      <p className="caps mb-3 mt-7 text-label text-ink-2">Jump to</p>
      <ul className="flex flex-col">
        {DEMO_JUMPS.map((j) => (
          <li key={j.id}>
            <button
              type="button"
              onClick={() => runDemoJump(j.id, router)}
              className="flex min-h-12 w-full items-center justify-between border-b border-hairline text-left"
            >
              <span className="font-serif text-body text-black">{j.label}</span>
              <span className="caps text-label text-ink-2">{j.key}</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="caps mb-3 mt-7 text-label text-ink-2">AI mode</p>
      <SegmentedControl<AIMode>
        ariaLabel="AI mode"
        options={[
          { value: "live", label: "Live" },
          { value: "scripted", label: "Scripted" },
        ]}
        value={aiMode}
        onChange={(v) => set({ aiMode: v })}
      />
      <p className="mt-3 font-serif text-caption text-ink-2">
        {status === null
          ? "Checking for an API key…"
          : status.hasKey
            ? `API key found. Live mode uses ${status.model}, with scripted fallback.`
            : "No API key on the server, so live mode uses the scripted responses."}
      </p>
    </div>
  );
}

export function KarmaSheet() {
  const d = useDerived();
  const credits = karmaCredits(d.summary);
  const top = d.rows
    .filter((r) => d.summary.labels[r.merchant.id] === "Aligned")
    .slice(0, 3);
  return (
    <div className="pt-2">
      <h2 className="head text-h2 text-black">Karma credits</h2>
      <p className="num mt-3 text-hero text-royal">{credits.toLocaleString()}</p>
      <p className="mt-2 font-serif text-body text-black">
        You earn 1 credit for every $2 you spend at companies that match the values you chose.
      </p>
      <p className="mt-3 font-serif text-caption text-ink-2">
        Credits come from your own values, so they change when you change them. They never reward spending more, and they&apos;re
        for fun. They don&apos;t measure how good you are.
      </p>
      {top.length > 0 && (
        <>
          <p className="caps mb-1 mt-6 text-label text-ink-2">Where this month&apos;s credits came from</p>
          <ul>
            {top.map((r) => (
              <li key={r.merchant.id} className="flex min-h-12 items-center justify-between border-b border-hairline">
                <span className="caps text-label text-black">{r.merchant.name}</span>
                <span className="num text-label text-black">+{Math.round(r.spend / 2)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function NotificationsSheet() {
  const router = useRouter();
  const d = useDerived();
  const close = useUI((s) => s.closeSheet);
  const items = [
    { t: "Spend report ready", b: "See how October compares with September.", href: "/report" },
    d.flagIds.length > 0 && {
      t: `${d.flagIds.length} merchants may not match your values`,
      b: "Tally can't say whether any purchase was right. Review them when you like.",
      href: "/spending?filter=flagged",
    },
    { t: "New: your next step", b: "Optional moves worked out from your own values.", href: "/home" },
  ].filter(Boolean) as { t: string; b: string; href: string }[];
  return (
    <div className="pt-2">
      <h2 className="head text-h2 text-black">Notifications</h2>
      <ul className="mt-4">
        {items.map((i) => (
          <li key={i.t} className="border-b border-hairline">
            <button
              type="button"
              onClick={() => {
                close();
                router.push(i.href);
              }}
              className="block min-h-14 w-full py-3 text-left"
            >
              <span className="caps block text-label text-black">{i.t}</span>
              <span className="block font-serif text-caption text-ink-2">{i.b}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
