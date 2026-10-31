"use client";

import { Screen } from "@/components/Screen";
import { BackButton, PrimaryButton } from "@/components/ui/Buttons";
import { HalftoneCompass } from "@/components/ui/HalftoneCompass";
import { Lock, Shield, Trash } from "@/components/ui/icons";
import { useUI } from "@/lib/store";

const ROWS = [
  { icon: Shield, text: "We never sell your data." },
  { icon: Trash, text: "Encrypted, deletable in one tap." },
  { icon: Lock, text: "Secure login through Plaid." },
];

export default function LinkPage() {
  const openSheet = useUI((s) => s.openSheet);
  return (
    <Screen footer={<PrimaryButton onClick={() => openSheet({ type: "bank" })}>Link with Plaid</PrimaryButton>}>
      <BackButton />
      <div className="mt-4">
        <HalftoneCompass size={96} />
      </div>
      <h1 className="head mt-6 text-h1 text-black">Link your bank</h1>
      <ul className="mt-8 flex flex-col gap-3">
        {ROWS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex min-h-[72px] items-center gap-4 rounded-row bg-fill px-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-tile bg-icon-tile">
              <Icon size={22} />
            </span>
            <span className="font-serif text-body text-black">{text}</span>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
